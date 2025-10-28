import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  Users,
  BookOpen,
  Calendar,
  Megaphone,
  Video,
  Plus,
  Clock,
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
  createSession,
  updateSessionStatus,
  createAnnouncement,
  deleteAnnouncement,
} from "../lib/api";
import { capitalize } from "../lib/utils";
import useAuthUser from "../hooks/useAuthUser";

const SpaceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    title: "",
    description: "",
    scheduledAt: "",
    duration: 60,
  });
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    content: "",
  });

  const { data: space, isLoading } = useQuery({
    queryKey: ["space", id],
    queryFn: () => getSpaceById(id),
  });

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
    createSession: useMutation({
      mutationFn: ({ spaceId, data }) => createSession(spaceId, data),
      onSuccess: () => {
        toast.success("Session created!");
        queryClient.invalidateQueries({ queryKey: ["space", id] });
        setShowSessionModal(false);
        setSessionForm({
          title: "",
          description: "",
          scheduledAt: "",
          duration: 60,
        });
      },
    }),
    updateSession: useMutation({
      mutationFn: ({ spaceId, sessionId, data }) =>
        updateSessionStatus(spaceId, sessionId, data),
      onSuccess: () => {
        toast.success("Session updated!");
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

  const isCreator = space.creator._id === authUser._id;
  const isMember = space.members.some((member) => member._id === authUser._id);
  const hasPendingRequest = space.pendingRequests.some(
    (user) => user._id === authUser._id
  );
  const isFull = space.members.length >= space.maxMembers;
  const upcomingSessions =
    space.sessions
      ?.filter((s) => s.status !== "completed" && s.status !== "cancelled")
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)) || [];
  const pastSessions =
    space.sessions
      ?.filter((s) => s.status === "completed" || s.status === "cancelled")
      .sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt)) || [];

  return (
    <div className="h-full overflow-y-auto bg-base-100">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate("/spaces")}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold">{space.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <div className="badge badge-primary">
                <BookOpen className="size-3 mr-1" />
                {capitalize(space.skill)}
              </div>
              <div className="text-sm text-base-content/70 flex items-center gap-2">
                <Users className="size-4" />
                {space.members.length}/{space.maxMembers} members
              </div>
            </div>
          </div>
        </div>

        <div className="tabs tabs-boxed mb-6 flex-wrap gap-2">
          <button
            className={`tab ${activeTab === "dashboard" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={`tab ${activeTab === "sessions" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("sessions")}
          >
            <Calendar className="size-4 mr-1" />
            Sessions
          </button>
          <button
            className={`tab ${
              activeTab === "announcements" ? "tab-active" : ""
            }`}
            onClick={() => setActiveTab("announcements")}
          >
            <Megaphone className="size-4 mr-1" />
            Announcements
          </button>
        </div>

        {activeTab === "dashboard" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Currently Grinding Section - Moved to top */}
              {isMember && (
                <div className="card bg-base-200">
                  <div className="card-body">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-lg">Currently Grinding</h3>
                      <button
                        onClick={() => navigate(`/spaces/${id}/stream`)}
                        className="btn btn-primary btn-sm gap-2"
                      >
                        <Video className="size-4" />
                        Enter Stream Room
                      </button>
                    </div>
                    
                    {/* Stream initialization notice */}
                    {!space.streamInitialized && !isCreator && (
                      <div className="alert alert-warning mb-4">
                        <div className="text-sm">
                          <p className="font-semibold">Stream room not ready yet</p>
                          <p className="text-xs mt-1">Waiting for the creator to initialize the stream room...</p>
                        </div>
                      </div>
                    )}
                    
                    {!space.streamInitialized && isCreator && (
                      <div className="alert alert-info mb-4">
                        <div className="text-sm">
                          <p className="font-semibold">Initialize your stream room</p>
                          <p className="text-xs mt-1">Click "Enter Stream Room" to make it available for all members!</p>
                        </div>
                      </div>
                    )}
                    
                    {space.activeStreams && space.activeStreams.length > 0 ? (
                      <div className="space-y-2">
                        {space.activeStreams.map((stream) => (
                          <div
                            key={stream._id}
                            className="flex items-center gap-3 p-3 bg-base-100 rounded-lg"
                          >
                            <div className="avatar">
                              <div className="w-10 h-10 rounded-full ring ring-primary ring-offset-base-100 ring-offset-1">
                                <img
                                  src={stream.user.profilePic || "/avatar.png"}
                                  alt={stream.user.fullName}
                                />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm">
                                {stream.user.fullName}
                              </h4>
                              <p className="text-xs text-base-content/60 truncate">
                                Focusing on: {stream.grindingTopic}
                              </p>
                            </div>
                            <div className="text-xs text-base-content/50">
                              Started at: {format(new Date(stream.startedAt), "h:mm a")}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-base-content/60">
                        <Video className="size-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No one is grinding yet</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Members Section */}
              <div className="card bg-base-200">
                <div className="card-body">
                  <h3 className="font-semibold text-lg mb-4">
                    Members ({space.members.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {space.members.map((member) => (
                      <div
                        key={member._id}
                        className="flex items-center gap-3 p-3 bg-base-100 rounded-lg"
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
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-6">
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
                          Learning: {capitalize(space.creator.learningSkill)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* About Section */}
              <div className="card bg-base-200">
                <div className="card-body">
                  <h3 className="font-semibold text-lg mb-2">About</h3>
                  <p className="text-base-content/70">{space.description}</p>
                  <div className="divider"></div>
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
                        className="btn btn-ghost gap-2 w-full"
                      >
                        <UserMinus className="size-5" />
                        Leave Space
                      </button>
                    ) : hasPendingRequest ? (
                      <button className="btn btn-disabled w-full">
                        Request Pending
                      </button>
                    ) : isFull ? (
                      <button className="btn btn-disabled w-full">
                        Space Full
                      </button>
                    ) : (
                      <button
                        onClick={() => mutations.requestJoin.mutate(id)}
                        className="btn btn-primary gap-2 w-full"
                      >
                        <UserPlus className="size-5" />
                        Request to Join
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              {isCreator && space.pendingRequests.length > 0 && (
                <div className="card bg-base-200">
                  <div className="card-body">
                    <h3 className="font-semibold text-lg mb-4">
                      Pending Requests ({space.pendingRequests.length})
                    </h3>
                    <div className="space-y-3">
                      {space.pendingRequests.map((user) => (
                        <div
                          key={user._id}
                          className="flex items-center gap-3 p-3 bg-base-100 rounded-lg"
                        >
                          <div className="avatar">
                            <div className="w-10 h-10 rounded-full">
                              <img src={user.profilePic} alt={user.fullName} />
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
                            >
                              <UserCheck className="size-3" />
                            </button>
                            <button
                              onClick={() =>
                                mutations.reject.mutate({
                                  spaceId: id,
                                  userId: user._id,
                                })
                              }
                              className="btn btn-error btn-xs btn-circle"
                            >
                              <UserX className="size-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "sessions" && (
          <div className="space-y-6">
            {isCreator && (
              <button
                onClick={() => setShowSessionModal(true)}
                className="btn btn-primary gap-2"
              >
                <Plus className="size-5" />
                Schedule Session
              </button>
            )}
            {upcomingSessions.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-4">
                  Upcoming Sessions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingSessions.map((session) => (
                    <div key={session._id} className="card bg-base-200">
                      <div className="card-body">
                        <div className="flex items-start justify-between">
                          <h4 className="font-bold text-lg">{session.title}</h4>
                          <div
                            className={`badge ${
                              session.status === "live"
                                ? "badge-success"
                                : "badge-info"
                            }`}
                          >
                            {session.status}
                          </div>
                        </div>
                        {session.description && (
                          <p className="text-sm text-base-content/70">
                            {session.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm mt-2">
                          <div className="flex items-center gap-1">
                            <Calendar className="size-4" />
                            {format(
                              new Date(session.scheduledAt),
                              "MMM dd, yyyy"
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="size-4" />
                            {format(new Date(session.scheduledAt), "hh:mm a")}
                          </div>
                        </div>
                        <div className="text-sm text-base-content/60">
                          Duration: {session.duration} minutes
                        </div>
                        {isCreator && session.status === "scheduled" && (
                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={() =>
                                mutations.updateSession.mutate({
                                  spaceId: id,
                                  sessionId: session._id,
                                  data: { status: "live" },
                                })
                              }
                              className="btn btn-success btn-sm"
                            >
                              Start Session
                            </button>
                            <button
                              onClick={() =>
                                mutations.updateSession.mutate({
                                  spaceId: id,
                                  sessionId: session._id,
                                  data: { status: "cancelled" },
                                })
                              }
                              className="btn btn-ghost btn-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                        {session.status === "live" && isMember && (
                          <button
                            onClick={() => navigate(`/spaces/${id}/stream`)}
                            className="btn btn-primary btn-sm mt-4 w-full"
                          >
                            Join Session
                          </button>
                        )}
                        {isCreator && session.status === "live" && (
                          <button
                            onClick={() =>
                              mutations.updateSession.mutate({
                                spaceId: id,
                                sessionId: session._id,
                                data: { status: "completed" },
                              })
                            }
                            className="btn btn-error btn-sm mt-2 w-full"
                          >
                            End Session
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {pastSessions.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-4">Past Sessions</h3>
                <div className="space-y-3">
                  {pastSessions.map((session) => (
                    <div key={session._id} className="card bg-base-200">
                      <div className="card-body p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold">{session.title}</h4>
                            <div className="flex flex-col gap-1 mt-1">
                              <p className="text-xs text-base-content/60">
                                Scheduled: {format(new Date(session.scheduledAt), "MMM dd, yyyy - h:mm a")}
                              </p>
                              {session.startedAt && (
                                <p className="text-xs text-base-content/60">
                                  Started: {format(new Date(session.startedAt), "MMM dd, yyyy - h:mm a")}
                                </p>
                              )}
                              {session.endedAt && (
                                <p className="text-xs text-base-content/60">
                                  Ended: {format(new Date(session.endedAt), "MMM dd, yyyy - h:mm a")}
                                </p>
                              )}
                            </div>
                          </div>
                          <div
                            className={`badge ${
                              session.status === "completed"
                                ? "badge-success"
                                : "badge-error"
                            }`}
                          >
                            {session.status}
                          </div>
                        </div>
                        
                        {/* Session Stats */}
                        {session.status === "completed" && session.stats && (
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            <div className="bg-base-300 rounded p-2 text-center">
                              <div className="text-xs text-base-content/60">Participants</div>
                              <div className="font-bold text-lg">{session.stats.totalParticipants || 0}</div>
                            </div>
                            <div className="bg-base-300 rounded p-2 text-center">
                              <div className="text-xs text-base-content/60">Hours Grinded</div>
                              <div className="font-bold text-lg">{(session.stats.totalHoursGrinded || 0).toFixed(1)}h</div>
                            </div>
                            <div className="bg-base-300 rounded p-2 text-center">
                              <div className="text-xs text-base-content/60">Duration</div>
                              <div className="font-bold text-lg">{session.stats.actualDuration || session.duration}m</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {upcomingSessions.length === 0 && pastSessions.length === 0 && (
              <div className="text-center py-12 bg-base-200 rounded-lg">
                <Calendar className="size-16 mx-auto mb-4 opacity-50" />
                <p className="text-base-content/60">
                  No sessions scheduled yet
                </p>
              </div>
            )}
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
                            <span>•</span>
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
                          >
                            <Trash className="size-4" />
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

        {showSessionModal && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg mb-4">Schedule New Session</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  mutations.createSession.mutate({
                    spaceId: id,
                    data: sessionForm,
                  });
                }}
                className="space-y-4"
              >
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Title</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered"
                    value={sessionForm.title}
                    onChange={(e) =>
                      setSessionForm({ ...sessionForm, title: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Description</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered"
                    value={sessionForm.description}
                    onChange={(e) =>
                      setSessionForm({
                        ...sessionForm,
                        description: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Scheduled Time</span>
                  </label>
                  <input
                    type="datetime-local"
                    className="input input-bordered"
                    value={sessionForm.scheduledAt}
                    onChange={(e) =>
                      setSessionForm({
                        ...sessionForm,
                        scheduledAt: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Duration (minutes)</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered"
                    value={sessionForm.duration}
                    onChange={(e) =>
                      setSessionForm({
                        ...sessionForm,
                        duration: parseInt(e.target.value),
                      })
                    }
                    min="15"
                    step="15"
                  />
                </div>
                <div className="modal-action">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setShowSessionModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create Session
                  </button>
                </div>
              </form>
            </div>
            <div
              className="modal-backdrop"
              onClick={() => setShowSessionModal(false)}
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
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Title</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered"
                    value={announcementForm.title}
                    onChange={(e) =>
                      setAnnouncementForm({
                        ...announcementForm,
                        title: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Content</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered h-32"
                    value={announcementForm.content}
                    onChange={(e) =>
                      setAnnouncementForm({
                        ...announcementForm,
                        content: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="modal-action">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setShowAnnouncementModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create Announcement
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
