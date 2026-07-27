import { useParams, useNavigate, Link } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUserProfile,
  getUserStatistics,
  getUserSessions,
  getUserSpaces,
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
  Globe,
  BookOpen,
  Edit,
  Users,
  Calendar,
  Clock,
  Target,
  TrendingUp,
  MessageSquare,
  UserPlus,
  UserX,
  CheckCircle,
  Shapes,
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
    (req) => req.recipient?._id === targetUserId || req.recipient === targetUserId
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

  const { data: spaces, isLoading: spacesLoading } = useQuery({
    queryKey: ["userSpaces", targetUserId],
    queryFn: () => getUserSpaces(targetUserId),
    enabled: !!targetUserId && canViewDetails,
  });

  const { mutate: unfriendMutation, isPending: isUnfriending } = useMutation({
    mutationFn: unfriend,
    onSuccess: () => {
      toast.success("Friend removed successfully");
      setShowUnfriendModal(false);
      queryClient.invalidateQueries({
        queryKey: ["userProfile", targetUserId],
      });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
    onError: () => {
      toast.error("Failed to remove friend");
      setShowUnfriendModal(false);
    },
  });

  const { mutate: sendFriendRequestMutation, isPending: isSendingRequest } = useMutation({
    mutationFn: sendFriendRequest,
    onSuccess: () => {
      toast.success("Friend request sent");
      queryClient.invalidateQueries({ queryKey: ["outgoingFriendReqs"] });
    },
    onError: () => {
      toast.error("Failed to send friend request");
    },
  });

  const { mutate: acceptFriendRequestMutation, isPending: isAccepting } = useMutation({
    mutationFn: acceptFriendRequest,
    onSuccess: () => {
      toast.success("Friend request accepted");
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["userProfile", targetUserId] });
    },
    onError: () => {
      toast.error("Failed to accept friend request");
    },
  });

  const { mutate: declineFriendRequestMutation, isPending: isDeclining } = useMutation({
    mutationFn: declineFriendRequest,
    onSuccess: () => {
      toast.success("Friend request declined");
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
    },
    onError: () => {
      toast.error("Failed to decline friend request");
    },
  });

  const handleUnfriend = () => {
    setShowUnfriendModal(true);
  };

  const confirmUnfriend = () => {
    unfriendMutation(targetUserId);
  };

  const handleSendFriendRequest = () => {
    sendFriendRequestMutation(targetUserId);
  };

  const handleAcceptRequest = () => {
    if (incomingRequest) {
      acceptFriendRequestMutation(incomingRequest._id);
    }
  };

  const handleDeclineRequest = () => {
    if (incomingRequest) {
      declineFriendRequestMutation(incomingRequest._id);
    }
  };

  if (profileLoading) {
    return <PageLoader />;
  }

  if (canViewDetails && (statsLoading || sessionsLoading || spacesLoading)) {
    return <PageLoader />;
  }

  if (profileError || !userProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">User Not Found</h2>
          <p className="text-base-content/60 mb-4">
            The user you're looking for doesn't exist.
          </p>
          <button className="btn btn-primary" onClick={() => navigate("/")}>
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
              <div className="avatar shrink-0">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full ring-3 ring-primary ring-offset-base-100 ring-offset-2">
                  <img
                    src={userProfile.profilePic}
                    alt={userProfile.fullName}
                    className="object-cover"
                  />
                </div>
              </div>

              <div className="text-center sm:text-left flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                  {userProfile.fullName}
                </h1>
                {userProfile.bio && (
                  <p className="text-base-content/70 mb-3 text-sm sm:text-base">
                    {userProfile.bio}
                  </p>
                )}

                <div className="flex flex-wrap gap-3 sm:gap-4 justify-center sm:justify-start text-sm">
                  {userProfile.location && (
                    <div className="flex items-center gap-1.5 text-base-content/60">
                      <MapPin className="size-4" />
                      <span>{userProfile.location}</span>
                    </div>
                  )}
                  {userProfile.nativeLanguage && (
                    <div className="flex items-center gap-1.5 text-base-content/60">
                      <Globe className="size-4" />
                      <span>{capitalize(userProfile.nativeLanguage)}</span>
                    </div>
                  )}
                  {userProfile.learningSkill && (
                    <div className="flex items-center gap-1.5 text-base-content/60">
                      <BookOpen className="size-4" />
                      <span>{capitalize(userProfile.learningSkill)}</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2 justify-center sm:justify-start">
                  <Users className="size-5 text-primary" />
                  <span className="font-semibold">
                    {userProfile.friends?.length || 0} Friends
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full lg:w-auto lg:ml-auto mt-4 lg:mt-0">
              {isOwnProfile ? (
                <Link to="/update-profile" className="btn btn-primary gap-2">
                  <Edit className="size-4" />
                  Edit Profile
                </Link>
              ) : (
                <>
                  {isFriend ? (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={handleUnfriend}
                        className="btn btn-error btn-outline gap-2"
                        disabled={isUnfriending}
                      >
                        {isUnfriending ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                          <UserX className="size-4" />
                        )}
                        Unfriend
                      </button>
                      <button
                        onClick={() => {
                          navigate(`/chats/${userProfile._id}`);
                        }}
                        className="btn btn-primary gap-2"
                      >
                        <MessageSquare className="size-4" />
                        Message
                      </button>
                    </div>
                  ) : incomingRequest ? (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={handleAcceptRequest}
                        className="btn btn-success gap-2"
                        disabled={isAccepting || isDeclining}
                      >
                        {isAccepting ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                          <Check className="size-4" />
                        )}
                        Accept Request
                      </button>
                      <button
                        onClick={handleDeclineRequest}
                        className="btn btn-error btn-outline gap-2"
                        disabled={isAccepting || isDeclining}
                      >
                        {isDeclining ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                          <X className="size-4" />
                        )}
                        Decline
                      </button>
                    </div>
                  ) : hasSentRequest ? (
                    <button className="btn btn-disabled gap-2" disabled>
                      <Clock className="size-4" />
                      Request Sent
                    </button>
                  ) : (
                    <button 
                      onClick={handleSendFriendRequest}
                      className="btn btn-primary gap-2"
                      disabled={isSendingRequest}
                    >
                      {isSendingRequest ? (
                        <span className="loading loading-spinner loading-xs"></span>
                      ) : (
                        <UserPlus className="size-4" />
                      )}
                      Add Friend
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {canViewDetails && statistics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <CheckCircle className="size-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-base-content/60">
                    Tasks Completed
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold">
                    {statistics.totalTasksCompleted || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-lg">
            <div className="card-body p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-secondary/10 rounded-lg">
                  <Calendar className="size-6 text-secondary" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-base-content/60">
                    Total Sessions
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold">
                    {statistics.totalSessions || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-lg">
            <div className="card-body p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-accent/10 rounded-lg">
                  <Clock className="size-6 text-accent" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-base-content/60">
                    Total Time
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold">
                    {formatTime(statistics.totalTimeSpent || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-lg">
            <div className="card-body p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-success/10 rounded-lg">
                  <TrendingUp className="size-6 text-success" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-base-content/60">
                    Avg Session
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold">
                    {formatTime(statistics.averageSessionDuration || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {canViewDetails && spaces && spaces.length > 0 && (
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title text-xl sm:text-2xl mb-4 flex items-center gap-2">
              <Shapes className="size-6" />
              Spaces
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {spaces.map((space) => (
                <Link
                  key={space._id}
                  to={`/spaces/${space._id}`}
                  className="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer shadow-md hover:shadow-lg"
                >
                  <div className="card-body p-4">
                    <h3 className="font-semibold text-base sm:text-lg truncate">
                      {space.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-base-content/60 mt-2">
                      <Users className="size-3 sm:size-4" />
                      <span>{space.members?.length || 0} members</span>
                    </div>
                    {space.skill && (
                      <div className="badge badge-primary badge-sm mt-2">
                        {space.skill}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {canViewDetails && sessions && sessions.length > 0 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title text-xl sm:text-2xl mb-4">
              Recent Completed Sessions
            </h2>
            <div className="space-y-3">
              {sessions
                .filter((session) => session.endTime)
                .slice(0, 5)
                .map((session) => (
                <div
                  key={session._id}
                  className="p-4 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base sm:text-lg truncate">
                        {session.grindingTopic}
                      </h3>
                      <div className="flex flex-wrap gap-2 sm:gap-3 mt-2 text-xs sm:text-sm text-base-content/60">
                        <div className="flex items-center gap-1">
                          <Clock className="size-3 sm:size-4" />
                          <span>
                            {formatTime(
                              Math.floor(
                                (new Date(session.endTime) -
                                  new Date(session.startTime)) /
                                  1000
                              )
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Target className="size-3 sm:size-4" />
                          <span>{session.targetDuration}m goal</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="size-3 sm:size-4" />
                          <span>
                            {formatDistanceToNow(new Date(session.startTime), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    {session.tasks && session.tasks.length > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <div className="badge badge-primary">
                          {session.tasks.filter((t) => t.isCompleted).length}/
                          {session.tasks.length} tasks
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!canViewDetails && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-6 sm:p-8 text-center">
            <Users className="size-16 mx-auto text-base-content/30 mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              Add as Friend to View More
            </h3>
            <p className="text-base-content/60 mb-4">
              Become friends with {userProfile.fullName} to see their detailed
              profile, statistics, and activity.
            </p>
            {incomingRequest ? (
              <div className="flex gap-2 justify-center">
                <button
                  onClick={handleAcceptRequest}
                  className="btn btn-success gap-2"
                  disabled={isAccepting || isDeclining}
                >
                  {isAccepting ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    <Check className="size-4" />
                  )}
                  Accept Request
                </button>
                <button
                  onClick={handleDeclineRequest}
                  className="btn btn-error btn-outline gap-2"
                  disabled={isAccepting || isDeclining}
                >
                  {isDeclining ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    <X className="size-4" />
                  )}
                  Decline
                </button>
              </div>
            ) : hasSentRequest ? (
              <button className="btn btn-disabled gap-2 mx-auto" disabled>
                <Clock className="size-4" />
                Request Sent
              </button>
            ) : (
              <button 
                onClick={handleSendFriendRequest}
                className="btn btn-primary gap-2 mx-auto"
                disabled={isSendingRequest}
              >
                {isSendingRequest ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  <UserPlus className="size-4" />
                )}
                Send Friend Request
              </button>
            )}
          </div>
        </div>
      )}

      {showUnfriendModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Unfriend {userProfile.fullName}?</h3>
            <p className="py-4">
              Are you sure you want to remove {userProfile.fullName} from your friends list?
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
                className="btn btn-error"
                onClick={confirmUnfriend}
                disabled={isUnfriending}
              >
                {isUnfriending ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  "Unfriend"
                )}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => !isUnfriending && setShowUnfriendModal(false)}></div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
