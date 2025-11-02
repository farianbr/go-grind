import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, Link } from "react-router";
import {
  ArrowLeft,
  Users,
  BookOpen,
  Info,
  Megaphone,
  Video,
  LayoutDashboard,
  Plus,
  Clock,
  ListTodo,
  Trash,
  UserPlus,
  UserMinus,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import {
  getSpaceById,
  approveJoinRequest,
  rejectJoinRequest,
  leaveSpace,
  deleteSpace,
  requestToJoinSpace,
  createAnnouncement,
  deleteAnnouncement,
  getNotifications,
  getSpaceSessionStats,
} from "../lib/api";
import { capitalize, minutesToHoursAndMinutes } from "../lib/utils";
import useAuthUser from "../hooks/useAuthUser";

const SpaceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    content: "",
  });

  const { data: space, isLoading } = useQuery({
    queryKey: ["space", id],
    queryFn: () => getSpaceById(id),
  });

  const isCreator = space?.creator._id === authUser?._id;
  const isMember = space?.members.some(
    (member) => member._id === authUser?._id
  );

  // Check if user is currently in this space's stream
  const isUserInThisStream = space?.activeStreams?.some(
    (stream) => stream.user._id === authUser?._id
  );

  // Fetch session statistics
  const { data: sessionStats, isLoading: statsLoading } = useQuery({
    queryKey: ["sessionStats", id],
    queryFn: () => getSpaceSessionStats(id),
    // Show stats to non-members as well (anyone viewing the space)
    enabled: !!id,
  });

  // Notifications (shared cache with Navbar) - used to compute unread announcement count for this space
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
    enabled: !!authUser,
  });

  const unreadAnnouncementCount =
    notifications.filter((n) => {
      if (!n) return false;
      if (n.type !== "announcement") return false;
      if (n.read) return false;
      // relatedSpace may be an id string or an object
      const related = n.relatedSpace;
      return (
        String(related) === String(id) ||
        (related && String(related._id) === String(id))
      );
    }).length || 0;

  const mutations = {
    approve: useMutation({
      mutationFn: ({ spaceId, userId }) => approveJoinRequest(spaceId, userId),
      onSuccess: () => {
        toast.success("Request approved!");
        queryClient.invalidateQueries({ queryKey: ["space", id] });
      },
    }),
    reject: useMutation({
      mutationFn: ({ spaceId, userId }) => rejectJoinRequest(spaceId, userId),
      onSuccess: () => {
        toast.success("Request rejected");
        queryClient.invalidateQueries({ queryKey: ["space", id] });
      },
    }),
    leave: useMutation({
      mutationFn: leaveSpace,
      onSuccess: () => {
        toast.success("Left space");
        navigate("/spaces");
      },
    }),
    delete: useMutation({
      mutationFn: deleteSpace,
      onSuccess: () => {
        toast.success("Space deleted");
        navigate("/spaces");
      },
    }),
    requestJoin: useMutation({
      mutationFn: requestToJoinSpace,
      onSuccess: () => {
        toast.success("Join request sent!");
        queryClient.invalidateQueries({ queryKey: ["space", id] });
      },
    }),
    createAnnouncement: useMutation({
      mutationFn: ({ spaceId, data }) => createAnnouncement(spaceId, data),
      onSuccess: () => {
        toast.success("Announcement created!");
        queryClient.invalidateQueries({ queryKey: ["space", id] });
        setShowAnnouncementModal(false);
        setAnnouncementForm({ title: "", content: "" });
      },
    }),
    deleteAnnouncement: useMutation({
      mutationFn: ({ spaceId, announcementId }) =>
        deleteAnnouncement(spaceId, announcementId),
      onSuccess: () => {
        toast.success("Announcement deleted");
        queryClient.invalidateQueries({ queryKey: ["space", id] });
      },
    }),
  };

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-full">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  if (!space)
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <h2 className="text-2xl font-bold mb-4">Space not found</h2>
        <button onClick={() => navigate("/spaces")} className="btn btn-primary">
          Back to Spaces
        </button>
      </div>
    );

  const hasPendingRequest = space.pendingRequests.some(
    (user) => user._id === authUser._id
  );

  return (
    <div className="h-full overflow-y-auto bg-base-100">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate("/spaces")}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl sm:text-3xl font-bold">{space.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <div className="badge badge-primary">
                <BookOpen className="size-3 mr-1" />
                {capitalize(space.skill)}
              </div>
              <div className="text-sm text-base-content/70 flex items-center gap-2">
                <Users className="size-4" />
                {space.members.length} members
              </div>
            </div>
          </div>
        </div>

        <div className="tabs tabs-box mb-6 flex-wrap gap-2">
          <button
            className={`tab ${activeTab === "dashboard" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <LayoutDashboard className="size-4 mr-1" />
            Dashboard
          </button>
          {(isMember || isCreator) && (
            <button
              className={`tab ${
                activeTab === "announcements" ? "tab-active" : ""
              }`}
              onClick={() => setActiveTab("announcements")}
            >
              <Megaphone className="size-4 mr-1" />
              Announcements
              {unreadAnnouncementCount > 0 && (
                <span className="badge badge-primary ml-2 badge-xs">
                  {unreadAnnouncementCount > 9 ? "9+" : unreadAnnouncementCount}
                </span>
              )}
            </button>
          )}
          <button
            className={`tab ${activeTab === "about" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("about")}
          >
            <Info className="size-4 mr-1" />
            About
            {isCreator &&
              space.pendingRequests &&
              space.pendingRequests.length > 0 && (
                <span className="badge badge-primary ml-2 badge-xs">
                  {space.pendingRequests.length > 9
                    ? "9+"
                    : space.pendingRequests.length}
                </span>
              )}
          </button>
        </div>

        {activeTab === "dashboard" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* If user is not a member show action button here in Dashboard */}

              {/* Currently Grinding Section */}
              {isMember && (
                <div className="card bg-base-200">
                  <div className="card-body p-3 sm:p-4 md:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
                      <h3 className="font-semibold text-base sm:text-lg">
                        Currently Streaming
                      </h3>
                      {isUserInThisStream ? (
                        <button
                          onClick={() => navigate(`/spaces/${id}/stream`)}
                          className="btn btn-success btn-xs sm:btn-sm gap-1 sm:gap-2 w-full sm:w-auto"
                        >
                          <Video className="size-3 sm:size-4" />
                          <span className="sm:hidden">Rejoin</span>
                          <span className="hidden sm:inline">
                            Back To Stream
                          </span>
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(`/spaces/${id}/stream`)}
                          className="btn btn-primary btn-xs sm:btn-sm gap-1 sm:gap-2 w-full sm:w-auto"
                        >
                          <Video className="size-3 sm:size-4" />
                          <span className="text-xs sm:text-sm">
                            Enter Stream Room
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Stream initialization notice */}
                    {!space.streamInitialized && !isCreator && (
                      <div className="alert alert-warning mb-3 sm:mb-4 py-2 sm:py-3">
                        <div className="text-xs sm:text-sm">
                          <p className="font-semibold">
                            Stream room not ready yet
                          </p>
                          <p className="text-[10px] sm:text-xs mt-0.5 sm:mt-1">
                            Waiting for the creator to initialize the stream
                            room...
                          </p>
                        </div>
                      </div>
                    )}

                    {!space.streamInitialized && isCreator && (
                      <div className="alert alert-info mb-3 sm:mb-4 py-2 sm:py-3">
                        <div className="text-xs sm:text-sm">
                          <p className="font-semibold">
                            Initialize your stream room
                          </p>
                          <p className="text-[10px] sm:text-xs mt-0.5 sm:mt-1">
                            Click "Enter Stream Room" to make it available for
                            all members!
                          </p>
                        </div>
                      </div>
                    )}

                    {space.activeStreams && space.activeStreams.length > 0 ? (
                      <div className="space-y-2">
                        {space.activeStreams.map((stream) => (
                          <div
                            key={stream._id}
                            className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-base-100 rounded-lg"
                          >
                            <div className="avatar">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full ring-2 sm:ring-3 ring-primary ring-offset-base-100 ring-offset-1">
                                <img
                                  src={stream.user.profilePic || "/avatar.png"}
                                  alt={stream.user.fullName}
                                />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-xs sm:text-sm truncate">
                                {stream.user.fullName}
                              </h4>
                              <p className="text-[10px] sm:text-xs text-base-content/60 truncate">
                                Focusing on: {stream.grindingTopic}
                              </p>
                            </div>
                            <div className="text-[9px] sm:text-xs text-base-content/50 shrink-0 hidden xs:block">
                              {format(new Date(stream.startedAt), "h:mm a")}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 sm:py-6 text-base-content/60">
                        <Video className="size-6 sm:size-8 mx-auto mb-1 sm:mb-2 opacity-30" />
                        <p className="text-xs sm:text-sm">
                          No one is grinding yet
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Space Statistics Section */}
              {sessionStats && (
                <div className="card bg-base-200">
                  <div className="card-body">
                    <h3 className="font-semibold text-lg mb-4">
                      Space Statistics
                    </h3>

                    {sessionStats.totalSessions > 0 ? (
                      <div className="flex flex-col lg:flex-row gap-4">
                        {/* Stats Grid */}
                        <div className="flex-1">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div className="stat bg-base-100 rounded-lg p-4">
                              <div className="stat-title text-xs">
                                Total Sessions
                              </div>
                              <div className="stat-value text-2xl text-primary">
                                {sessionStats.totalSessions}
                              </div>
                            </div>
                            <div className="stat bg-base-100 rounded-lg p-4">
                              <div className="stat-title text-xs">
                                Total Hours
                              </div>
                              <div className="stat-value text-2xl text-success">
                                {Math.round(sessionStats.totalHours)}h
                              </div>
                            </div>
                            <div className="stat bg-base-100 rounded-lg p-4">
                              <div className="stat-title text-xs">
                                Avg Duration
                              </div>
                              <div className="stat-value text-2xl text-info">
                                {Math.round(sessionStats.avgDuration)}m
                              </div>
                            </div>
                            <div className="stat bg-base-100 rounded-lg p-4">
                              <div className="stat-title text-xs">
                                Task Completion
                              </div>
                              <div className="stat-value text-2xl text-warning">
                                {Math.round(sessionStats.taskCompletionRate)}%
                              </div>
                            </div>
                            <div className="stat bg-base-100 rounded-lg p-4">
                              <div className="stat-title text-xs">
                                Target Met
                              </div>
                              <div className="stat-value text-2xl text-secondary">
                                {Math.round(sessionStats.sessionCompletionRate)}
                                %
                              </div>
                            </div>
                            <div className="stat bg-base-100 rounded-lg p-4">
                              <div className="stat-title text-xs">
                                Participants
                              </div>
                              <div className="stat-value text-2xl text-accent">
                                {Math.round(sessionStats.uniqueParticipants)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-base-content/60">
                        <Clock className="size-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No completed sessions yet</p>
                        <p className="text-xs mt-1">
                          Start a session to see statistics here
                        </p>
                      </div>
                    )}

                    {statsLoading && (
                      <div className="text-center py-6">
                        <span className="loading loading-spinner loading-md"></span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {!isMember && (
                <div className="card bg-base-200">
                  <div className="card-body">
                    <h3 className="font-semibold text-lg mb-4">Actions</h3>
                    <div className="flex flex-wrap gap-2">
                      {hasPendingRequest ? (
                        <button className="btn btn-disabled w-full">
                          Request Pending
                        </button>
                      ) : (
                        <button
                          onClick={() => mutations.requestJoin.mutate(id)}
                          className="btn btn-primary gap-2 w-full"
                          disabled={mutations.requestJoin.isPending}
                        >
                          {mutations.requestJoin.isPending ? (
                            <span className="loading loading-spinner loading-sm"></span>
                          ) : (
                            <>
                              <UserPlus className="size-5" />
                              Request to Join
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Right column - Recent Sessions */}
            {(isMember || isCreator) && (
              <div className="space-y-6">
                <div className="card bg-base-200">
                  <div className="card-body">
                    <h3 className="font-semibold text-lg mb-4">
                      Recent Sessions
                    </h3>
                    {sessionStats?.recentSessions &&
                    sessionStats?.recentSessions?.length > 0 ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 gap-3">
                          {sessionStats.recentSessions
                            .slice(0, 3)
                            .map((session) => (
                              <div
                                key={session._id}
                                className="bg-base-100 rounded-lg p-3 flex items-start gap-3 shadow-sm hover:shadow-md transition-shadow duration-150"
                              >
                                <div className="avatar shrink-0">
                                  <div className="w-12 h-12 sm:w-10 sm:h-10 rounded-full">
                                    <img
                                      src={
                                        session.user.profilePic || "/avatar.png"
                                      }
                                      alt={session.user.fullName}
                                    />
                                  </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <h5 className="font-semibold text-sm truncate">
                                        {session.user.fullName}
                                      </h5>
                                      <p className="text-xs text-base-content/60 truncate">
                                        {session.grindingTopic}
                                      </p>
                                    </div>

                                    {/* Badge */}
                                    <div className="shrink-0 ">
                                      <div
                                        className={`badge badge-sm  ${
                                          session.actualDuration >=
                                          session.targetDuration
                                            ? "badge-success"
                                            : "badge-warning"
                                        }`}
                                      >
                                        <Clock className="size-3 my-auto" />
                                        {
                                          minutesToHoursAndMinutes(
                                            session.actualDuration
                                          ).hours
                                        }
                                        h{" "}
                                        {
                                          minutesToHoursAndMinutes(
                                            session.actualDuration
                                          ).minutes
                                        }
                                        m
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between gap-3 mt-2">
                                    <div className="text-xs text-base-content/50 flex items-center gap-2">
                                      {/* tasks: use icon on small screens */}
                                      <span className="inline-flex items-center gap-1">
                                        <span className="hidden xl:inline">
                                          {session.tasksCompleted}/
                                          {session.totalTasks} tasks
                                        </span>
                                        <span className="xl:hidden flex items-center gap-1">
                                          <ListTodo className="size-4" />
                                          {session.tasksCompleted}/
                                          {session.totalTasks}
                                        </span>
                                      </span>
                                    </div>

                                    {/* Date/time for xl+ on the right */}
                                    <div className="hidden xl:block text-right ml-2 text-[11px] text-base-content/50 shrink-0">
                                      <div>
                                        {format(
                                          new Date(session.endTime),
                                          "dd MMM, yyyy"
                                        )}
                                      </div>
                                    </div>
                                    {/* Date/time for small screens below name */}
                                    <div className="block xl:hidden text-xs text-base-content/50 mt-1">
                                      {format(
                                        new Date(session.endTime),
                                        "dd MMM, yyyy"
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          {sessionStats.recentSessions.length > 3 && (
                            <div className="col-span-1">
                              <div className="p-3 bg-base-100 rounded-lg text-center">
                                <div className="text-sm font-medium">
                                  {sessionStats.recentSessions.length - 3} more
                                  cool sessions!
                                </div>
                                <div className="text-xs text-base-content/60 mt-2">
                                  <Link
                                    to={`/spaces/${id}/stream`}
                                    className="btn btn-sm btn-outline"
                                  >
                                    Join in
                                  </Link>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-base-content/60">
                        <p className="text-sm">No recent sessions yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "about" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Members Section */}
              <div className="card bg-base-200">
                <div className="card-body">
                  <h3 className="font-semibold text-lg mb-4">
                    Members ({space.members.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {space.members.map((member) => (
                      <Link
                        key={member._id}
                        to={`/profile/${member._id}`}
                        className="flex items-center gap-3 p-3 bg-base-100 rounded-lg hover:bg-base-300 transition-colors cursor-pointer"
                      >
                        <div className="avatar">
                          <div className="w-12 h-12 rounded-full">
                            <img
                              src={member.profilePic}
                              alt={member.fullName}
                            />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">
                            {member.fullName}
                          </h4>
                          {member.learningSkill && (
                            <p className="text-sm text-base-content/60 truncate">
                              {capitalize(member.learningSkill)}
                            </p>
                          )}
                        </div>
                        {member._id === space.creator._id && (
                          <div className="badge badge-primary badge-sm">
                            Creator
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                  {/* Pending Requests - moved inside Members card */}
                  {isCreator && space.pendingRequests.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold mb-3">
                        Pending Requests ({space.pendingRequests.length})
                      </h4>
                      <div className="space-y-3">
                        {space.pendingRequests.map((user) => (
                          <div
                            key={user._id}
                            className="flex items-center gap-3 p-3 bg-base-100 rounded-lg"
                          >
                            <div className="avatar">
                              <div className="w-10 h-10 rounded-full">
                                <img
                                  src={user.profilePic}
                                  alt={user.fullName}
                                />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm truncate">
                                {user.fullName}
                              </h4>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() =>
                                  mutations.approve.mutate({
                                    spaceId: id,
                                    userId: user._id,
                                  })
                                }
                                className="btn btn-success btn-xs btn-circle"
                                disabled={mutations.approve.isPending}
                              >
                                {mutations.approve.isPending ? (
                                  <span className="loading loading-spinner loading-xs"></span>
                                ) : (
                                  <UserCheck className="size-3" />
                                )}
                              </button>
                              <button
                                onClick={() =>
                                  mutations.reject.mutate({
                                    spaceId: id,
                                    userId: user._id,
                                  })
                                }
                                className="btn btn-error btn-xs btn-circle"
                                disabled={mutations.reject.isPending}
                              >
                                {mutations.reject.isPending ? (
                                  <span className="loading loading-spinner loading-xs"></span>
                                ) : (
                                  <UserX className="size-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* About/Description Section */}
              <div className="card bg-base-200">
                <div className="card-body">
                  <h3 className="font-semibold text-lg mb-2">About</h3>
                  <p className="text-base-content/70">{space.description}</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Creator Section */}
              <div className="card bg-base-200">
                <div className="card-body">
                  <h3 className="font-semibold mb-4">Created By</h3>
                  <div className="flex items-center gap-3">
                    <div className="avatar">
                      <div className="w-16 h-16 rounded-full">
                        <img
                          src={space.creator.profilePic}
                          alt={space.creator.fullName}
                        />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold">
                        {space.creator.fullName}
                      </h4>
                      {space.creator.learningSkill && (
                        <p className="text-sm text-base-content/60">
                          Focus: {capitalize(space.creator.learningSkill)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Section - show inside About only for creators or members */}
              {(isCreator || isMember) && (
                <div className="card bg-base-200">
                  <div className="card-body">
                    <h3 className="font-semibold text-lg mb-4">Actions</h3>
                    <div className="flex flex-wrap gap-2">
                      {isCreator ? (
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="btn btn-error gap-2 w-full"
                        >
                          <Trash2 className="size-5" />
                          Delete Space
                        </button>
                      ) : isMember ? (
                        <button
                          onClick={() => mutations.leave.mutate(id)}
                          className="btn btn-error gap-2 w-full"
                          disabled={mutations.leave.isPending}
                        >
                          {mutations.leave.isPending ? (
                            <span className="loading loading-spinner loading-sm"></span>
                          ) : (
                            <>
                              <UserMinus className="size-5" />
                              Leave Space
                            </>
                          )}
                        </button>
                      ) : hasPendingRequest ? (
                        <button className="btn btn-disabled w-full">
                          Request Pending
                        </button>
                      ) : (
                        <button
                          onClick={() => mutations.requestJoin.mutate(id)}
                          className="btn btn-primary gap-2 w-full"
                          disabled={mutations.requestJoin.isPending}
                        >
                          {mutations.requestJoin.isPending ? (
                            <span className="loading loading-spinner loading-sm"></span>
                          ) : (
                            <>
                              <UserPlus className="size-5" />
                              Request to Join
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Pending requests moved into Members section above */}
            </div>
          </div>
        )}

        {activeTab === "announcements" && (
          <div className="space-y-6">
            {isCreator && (
              <button
                onClick={() => setShowAnnouncementModal(true)}
                className="btn btn-primary gap-2"
              >
                <Plus className="size-5" />
                New Announcement
              </button>
            )}
            {space.announcements && space.announcements.length > 0 ? (
              <div className="space-y-4">
                {space.announcements.map((announcement) => (
                  <div key={announcement._id} className="card bg-base-200">
                    <div className="card-body">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-bold text-lg mb-2">
                            {announcement.title}
                          </h4>
                          <p className="text-base-content/80 whitespace-pre-wrap">
                            {announcement.content}
                          </p>
                          <div className="flex items-center gap-2 mt-4 text-sm text-base-content/60">
                            <div className="avatar">
                              <div className="w-6 h-6 rounded-full">
                                <img
                                  src={announcement.createdBy.profilePic}
                                  alt={announcement.createdBy.fullName}
                                />
                              </div>
                            </div>
                            <span>{announcement.createdBy.fullName}</span>
                            <span> • </span>
                            <span>
                              {format(
                                new Date(announcement.createdAt),
                                "MMM dd, yyyy"
                              )}
                            </span>
                          </div>
                        </div>
                        {isCreator && (
                          <button
                            onClick={() =>
                              mutations.deleteAnnouncement.mutate({
                                spaceId: id,
                                announcementId: announcement._id,
                              })
                            }
                            className="btn btn-ghost btn-sm btn-circle"
                            disabled={mutations.deleteAnnouncement.isPending}
                          >
                            {mutations.deleteAnnouncement.isPending ? (
                              <span className="loading loading-spinner loading-xs"></span>
                            ) : (
                              <Trash className="size-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-base-200 rounded-lg">
                <Megaphone className="size-16 mx-auto mb-4 opacity-50" />
                <p className="text-base-content/60">No announcements yet</p>
              </div>
            )}
          </div>
        )}

        {showDeleteConfirm && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg mb-4">Delete Space?</h3>
              <p className="mb-4">
                Are you sure you want to delete this space? This action cannot
                be undone.
              </p>
              <div className="modal-action">
                <button
                  className="btn btn-ghost"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-error"
                  onClick={() => {
                    mutations.delete.mutate(id);
                    setShowDeleteConfirm(false);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
            <div
              className="modal-backdrop"
              onClick={() => setShowDeleteConfirm(false)}
            ></div>
          </div>
        )}

        {showAnnouncementModal && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg mb-4">New Announcement</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  mutations.createAnnouncement.mutate({
                    spaceId: id,
                    data: announcementForm,
                  });
                }}
                className="space-y-4"
              >
                <fieldset className="fieldset">
                  <label className="label" htmlFor="announcement-title">
                    Title
                  </label>
                  <input
                    id="announcement-title"
                    type="text"
                    className="input w-full"
                    value={announcementForm.title}
                    onChange={(e) =>
                      setAnnouncementForm({
                        ...announcementForm,
                        title: e.target.value,
                      })
                    }
                    required
                  />
                </fieldset>
                <fieldset className="fieldset">
                  <label className="label" htmlFor="announcement-content">
                    Content
                  </label>
                  <textarea
                    id="announcement-content"
                    className="textarea h-32 w-full"
                    value={announcementForm.content}
                    onChange={(e) =>
                      setAnnouncementForm({
                        ...announcementForm,
                        content: e.target.value,
                      })
                    }
                    required
                  />
                </fieldset>
                <div className="modal-action">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setShowAnnouncementModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={mutations.createAnnouncement.isPending}
                  >
                    {mutations.createAnnouncement.isPending ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : (
                      "Create Announcement"
                    )}
                  </button>
                </div>
              </form>
            </div>
            <div
              className="modal-backdrop"
              onClick={() => setShowAnnouncementModal(false)}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpaceDetailPage;
