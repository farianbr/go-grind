import { useParams, useNavigate, Link } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUserProfile,
  getUserStatistics,
  getUserSessions,
  getUserRooms,
  getMyRooms,
  unfriend,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  getFriendRequests,
  getOutgoingFriendReqs,
} from "../lib/api";
import useAuthUser from "../hooks/useAuthUser";
import toast from "react-hot-toast";
import PageLoader from "../components/PageLoader";
import {
  MapPin,
  Briefcase,
  Pencil,
  Users,
  Clock,
  MessageSquare,
  UserPlus,
  UserX,
  Check,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { capitalize } from "../lib/utils";
import { useState } from "react";

const ProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();
  const [showUnfriendModal, setShowUnfriendModal] = useState(false);

  const isOwnProfile = !userId || userId === authUser?._id;
  const targetUserId = isOwnProfile ? authUser?._id : userId;

  const {
    data: userProfile,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery({
    queryKey: ["userProfile", targetUserId],
    queryFn: () => getUserProfile(targetUserId),
    enabled: !!targetUserId,
  });

  const isFriend = userProfile?.friends?.some(
    (friend) => friend._id === authUser?._id || friend === authUser?._id
  );

  const { data: friendRequestsData } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: getFriendRequests,
    enabled: !isOwnProfile && !!authUser,
  });

  const { data: outgoingRequests = [] } = useQuery({
    queryKey: ["outgoingFriendReqs"],
    queryFn: getOutgoingFriendReqs,
    enabled: !isOwnProfile && !!authUser,
  });

  const incomingRequest = friendRequestsData?.incomingRequests?.find(
    (req) => req.sender?._id === targetUserId || req.sender === targetUserId
  );

  const hasSentRequest = outgoingRequests?.some(
    (req) =>
      req.recipient?._id === targetUserId || req.recipient === targetUserId
  );

  const canViewDetails = isOwnProfile || isFriend;

  const { data: statistics, isLoading: statsLoading } = useQuery({
    queryKey: ["userStatistics", targetUserId],
    queryFn: () => getUserStatistics(targetUserId),
    enabled: !!targetUserId && canViewDetails,
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["userSessions", targetUserId],
    queryFn: () => getUserSessions(targetUserId),
    enabled: !!targetUserId && canViewDetails,
  });

  const { data: rooms, isLoading: spacesLoading } = useQuery({
    queryKey: ["userRooms", targetUserId],
    queryFn: () => getUserRooms(targetUserId),
    enabled: !!targetUserId && canViewDetails,
  });

  // Rooms both of you are in. In a co-working product this is the useful fact
  // about another person, more than any lifetime total.
  const { data: myRooms = [] } = useQuery({
    queryKey: ["myRooms"],
    queryFn: getMyRooms,
    enabled: !isOwnProfile && !!authUser && canViewDetails,
  });
  const sharedRoomIds = new Set(myRooms.map((room) => room._id));

  const liveSession = sessions?.find((session) => !session.isCompleted);

  const { mutate: unfriendMutation, isPending: isUnfriending } = useMutation({
    mutationFn: unfriend,
    onSuccess: () => {
      toast.success("Removed.");
      setShowUnfriendModal(false);
      queryClient.invalidateQueries({
        queryKey: ["userProfile", targetUserId],
      });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
    onError: () => {
      toast.error("Couldn't remove them.");
      setShowUnfriendModal(false);
    },
  });

  const { mutate: sendFriendRequestMutation, isPending: isSendingRequest } =
    useMutation({
      mutationFn: sendFriendRequest,
      onSuccess: () => {
        toast.success("Request sent.");
        queryClient.invalidateQueries({ queryKey: ["outgoingFriendReqs"] });
      },
      onError: () => toast.error("Couldn't send that request."),
    });

  const { mutate: acceptFriendRequestMutation, isPending: isAccepting } =
    useMutation({
      mutationFn: acceptFriendRequest,
      onSuccess: () => {
        toast.success("You're connected.");
        queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
        queryClient.invalidateQueries({ queryKey: ["friends"] });
        queryClient.invalidateQueries({
          queryKey: ["userProfile", targetUserId],
        });
      },
      onError: () => toast.error("Couldn't accept that request."),
    });

  const { mutate: declineFriendRequestMutation, isPending: isDeclining } =
    useMutation({
      mutationFn: declineFriendRequest,
      onSuccess: () => {
        toast.success("Request declined.");
        queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
      },
      onError: () => toast.error("Couldn't decline that request."),
    });

  if (profileLoading) return <PageLoader />;
  if (canViewDetails && (statsLoading || sessionsLoading || spacesLoading))
    return <PageLoader />;

  if (profileError || !userProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <h1 className="text-xl font-bold mb-2">No such person</h1>
        <p className="text-sm text-base-content/60 mb-4">
          That profile doesn&apos;t exist, or it was deleted.
        </p>
        <button className="btn btn-primary" onClick={() => navigate("/")}>
          Go home
        </button>
      </div>
    );
  }

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const stats = statistics
    ? [
        { label: "Hours logged", value: formatTime(statistics.totalTimeSpent || 0) },
        { label: "Sessions", value: statistics.totalSessions || 0 },
        { label: "Tasks done", value: statistics.totalTasksCompleted || 0 },
      ]
    : [];

  const finished = (sessions || []).filter((s) => s.endTime).slice(0, 6);

  const relationshipAction = isOwnProfile ? (
    <Link to="/settings" className="btn btn-outline btn-sm gap-2">
      <Pencil className="size-4" />
      Edit profile
    </Link>
  ) : isFriend ? (
    <div className="flex gap-2">
      <Link
        to={`/chats/${userProfile._id}`}
        className="btn btn-primary btn-sm gap-2"
      >
        <MessageSquare className="size-4" />
        Message
      </Link>
      <button
        onClick={() => setShowUnfriendModal(true)}
        className="btn btn-ghost btn-sm"
        disabled={isUnfriending}
      >
        Remove
      </button>
    </div>
  ) : incomingRequest ? (
    <div className="flex gap-2">
      <button
        onClick={() => acceptFriendRequestMutation(incomingRequest._id)}
        className="btn btn-primary btn-sm gap-2"
        disabled={isAccepting || isDeclining}
      >
        {isAccepting ? (
          <span className="loading loading-spinner loading-xs" />
        ) : (
          <Check className="size-4" />
        )}
        Accept
      </button>
      <button
        onClick={() => declineFriendRequestMutation(incomingRequest._id)}
        className="btn btn-ghost btn-sm gap-2"
        disabled={isAccepting || isDeclining}
      >
        {isDeclining ? (
          <span className="loading loading-spinner loading-xs" />
        ) : (
          <X className="size-4" />
        )}
        Decline
      </button>
    </div>
  ) : hasSentRequest ? (
    <button className="btn btn-sm btn-disabled gap-2">
      <Clock className="size-4" />
      Request sent
    </button>
  ) : (
    <button
      onClick={() => sendFriendRequestMutation(targetUserId)}
      className="btn btn-primary btn-sm gap-2"
      disabled={isSendingRequest}
    >
      {isSendingRequest ? (
        <span className="loading loading-spinner loading-xs" />
      ) : (
        <UserPlus className="size-4" />
      )}
      Connect
    </button>
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="container mx-auto max-w-4xl">
        {/* ---- identity ---- */}
        <header className="pb-6 border-b border-base-300">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            <img
              src={userProfile.profilePic || "/blank-pp.png"}
              alt=""
              className="size-20 sm:size-24 rounded-full object-cover shrink-0"
            />

            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    {userProfile.fullName}
                  </h1>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-base-content/60">
                    {userProfile.role && (
                      <span className="inline-flex items-center gap-1.5">
                        <Briefcase className="size-3.5" />
                        {capitalize(userProfile.role)}
                      </span>
                    )}
                    {userProfile.location && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="size-3.5" />
                        {userProfile.location}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="size-3.5" />
                      {userProfile.friends?.length || 0} connected
                    </span>
                  </div>
                </div>
                <div className="shrink-0">{relationshipAction}</div>
              </div>

              {userProfile.bio && (
                <p className="text-sm text-base-content/75 mt-3 max-w-prose">
                  {userProfile.bio}
                </p>
              )}

              {canViewDetails && liveSession && (
                <p className="inline-flex items-center gap-2 mt-3 text-sm font-medium text-success">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                    <span className="relative inline-flex size-2 rounded-full bg-success" />
                  </span>
                  {liveSession.room?.name
                    ? `At a desk in ${liveSession.room.name}`
                    : "Working right now"}
                  <span className="font-normal text-base-content/55">
                    {liveSession.workTopic}
                  </span>
                </p>
              )}
            </div>
          </div>
        </header>

        {!canViewDetails ? (
          <div className="py-12 text-center">
            <h2 className="font-semibold mb-1.5">This profile is private</h2>
            <p className="text-sm text-base-content/60 max-w-sm mx-auto">
              Connect with {userProfile.fullName.split(" ")[0]} to see their
              rooms, hours and what they are working on.
            </p>
          </div>
        ) : (
          <>
            {statistics && (
              <dl className="flex flex-wrap gap-8 sm:gap-12 py-6 border-b border-base-300">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <dt className="text-[11px] uppercase tracking-wide text-base-content/50">
                      {stat.label}
                    </dt>
                    <dd className="text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight mt-0.5">
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            {rooms?.length > 0 && (
              <section className="py-6 border-b border-base-300">
                <h2 className="font-semibold mb-3">
                  Rooms
                  {!isOwnProfile && (
                    <span className="font-normal text-sm text-base-content/55 ml-2">
                      shared ones marked
                    </span>
                  )}
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {rooms.map((room) => {
                    const shared = !isOwnProfile && sharedRoomIds.has(room._id);
                    return (
                      <li key={room._id}>
                        <Link
                          to={`/rooms/${room._id}`}
                          className={`inline-flex items-center gap-2 rounded-field border px-3 py-1.5 text-sm transition-colors ${
                            shared
                              ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
                              : "border-base-300 hover:bg-base-200"
                          }`}
                        >
                          {room.name}
                          <span className="text-xs text-base-content/50">
                            {room.members?.length ?? 0}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {finished.length > 0 && (
              <section className="py-6">
                <h2 className="font-semibold mb-1">Recent sessions</h2>
                <ul className="divide-y divide-base-300 border-t border-base-300">
                  {finished.map((session) => (
                    <li
                      key={session._id}
                      className="flex items-baseline gap-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {session.workTopic}
                        </p>
                        <p className="text-xs text-base-content/55 mt-0.5">
                          {formatDistanceToNow(new Date(session.startTime), {
                            addSuffix: true,
                          })}
                          {session.room?.name ? ` · ${session.room.name}` : ""}
                        </p>
                      </div>
                      {session.tasks?.length > 0 && (
                        <span className="text-xs text-base-content/55 shrink-0 tabular-nums">
                          {session.tasks.filter((t) => t.isCompleted).length}/
                          {session.tasks.length} tasks
                        </span>
                      )}
                      <span className="text-sm font-mono tabular-nums shrink-0">
                        {formatTime(
                          Math.floor(
                            (new Date(session.endTime) -
                              new Date(session.startTime)) /
                              1000
                          )
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {showUnfriendModal && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg mb-2">
                Remove {userProfile.fullName}?
              </h3>
              <p className="text-sm text-base-content/70 mb-4">
                You&apos;ll stop seeing each other&apos;s sessions. Any rooms or
                teams you share stay as they are.
              </p>
              <div className="modal-action">
                <button
                  className="btn btn-ghost"
                  onClick={() => setShowUnfriendModal(false)}
                  disabled={isUnfriending}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-error gap-2"
                  onClick={() => unfriendMutation(targetUserId)}
                  disabled={isUnfriending}
                >
                  {isUnfriending ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <UserX className="size-4" />
                  )}
                  Remove
                </button>
              </div>
            </div>
            <div
              className="modal-backdrop"
              onClick={() => !isUnfriending && setShowUnfriendModal(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
