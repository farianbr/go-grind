import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, Link } from "react-router";
import {
  ArrowLeft,
  Building2,
  Users,
  Info,
  Megaphone,
  Video,
  DoorOpen,
  Plus,
  Clock,
  ListTodo,
  Trash,
  MessagesSquare,
  UserPlus,
  UserMinus,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import {
  getRoomById,
  approveJoinRequest,
  rejectJoinRequest,
  leaveRoom,
  deleteRoom,
  requestToJoinRoom,
  createAnnouncement,
  deleteAnnouncement,
  getNotifications,
  getRoomSessionStats,
} from "../lib/api";
import { capitalize, minutesToHoursAndMinutes } from "../lib/utils";
import useAuthUser from "../hooks/useAuthUser";

const RoomDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();
  const [activeTab, setActiveTab] = useState("desks");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    content: "",
  });

  const { data: room, isLoading } = useQuery({
    queryKey: ["room", id],
    queryFn: () => getRoomById(id),
    refetchInterval: 20_000,
  });

  const isCreator = room?.creator?._id === authUser?._id;
  const isMember = room?.members?.some(
    (member) => member._id === authUser?._id
  );
  const atADeskHere = room?.activeStreams?.some(
    (stream) => stream.user?._id === authUser?._id
  );

  const { data: sessionStats } = useQuery({
    queryKey: ["sessionStats", id],
    queryFn: () => getRoomSessionStats(id),
    enabled: !!id,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
    enabled: !!authUser,
  });

  const unreadAnnouncementCount =
    notifications?.notifications?.filter((n) => {
      if (!n || n.type !== "announcement" || n.read) return false;
      const related = n.relatedRoom;
      return (
        String(related) === String(id) ||
        (related && String(related._id) === String(id))
      );
    }).length || 0;

  const mutations = {
    approve: useMutation({
      mutationFn: ({ roomId, userId }) => approveJoinRequest(roomId, userId),
      onSuccess: () => {
        toast.success("They're in.");
        queryClient.invalidateQueries({ queryKey: ["room", id] });
      },
    }),
    reject: useMutation({
      mutationFn: ({ roomId, userId }) => rejectJoinRequest(roomId, userId),
      onSuccess: () => {
        toast.success("Request declined");
        queryClient.invalidateQueries({ queryKey: ["room", id] });
      },
    }),
    leave: useMutation({
      mutationFn: leaveRoom,
      onSuccess: () => {
        toast.success("Left the room");
        navigate("/rooms");
      },
    }),
    delete: useMutation({
      mutationFn: deleteRoom,
      onSuccess: () => {
        toast.success("Room deleted");
        navigate("/rooms");
      },
    }),
    requestJoin: useMutation({
      mutationFn: requestToJoinRoom,
      onSuccess: (data) => {
        toast.success(data?.message ?? "Join request sent");
        queryClient.invalidateQueries({ queryKey: ["room", id] });
      },
    }),
    createAnnouncement: useMutation({
      mutationFn: ({ roomId, data }) => createAnnouncement(roomId, data),
      onSuccess: () => {
        toast.success("Posted to the room");
        queryClient.invalidateQueries({ queryKey: ["room", id] });
        setShowAnnouncementModal(false);
        setAnnouncementForm({ title: "", content: "" });
      },
    }),
    deleteAnnouncement: useMutation({
      mutationFn: ({ roomId, announcementId }) =>
        deleteAnnouncement(roomId, announcementId),
      onSuccess: () => {
        toast.success("Announcement removed");
        queryClient.invalidateQueries({ queryKey: ["room", id] });
      },
    }),
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="container mx-auto max-w-6xl space-y-4">
          <div className="skeleton h-24 w-full" />
          <div className="skeleton h-10 w-64" />
          <div className="skeleton h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <h2 className="text-xl font-bold mb-2">That room is gone</h2>
        <p className="text-sm text-base-content/60 mb-4">
          It may have been deleted by its host.
        </p>
        <Link to="/rooms" className="btn btn-primary">
          Back to rooms
        </Link>
      </div>
    );
  }

  const hasPendingRequest = (room.pendingRequests || []).some(
    (user) => String(user?._id ?? user) === authUser?._id
  );
  const atDesks = room.activeStreams || [];
  const needsApproval = room.joinPolicy === "approval";

  const tabs = [
    { key: "desks", label: "Desks", icon: Video },
    ...(isMember || isCreator
      ? [
          {
            key: "announcements",
            label: "Notices",
            icon: Megaphone,
            badge: unreadAnnouncementCount,
          },
        ]
      : []),
    {
      key: "members",
      label: "Members",
      icon: Users,
      badge: isCreator ? room.pendingRequests?.length ?? 0 : 0,
    },
    { key: "about", label: "About", icon: Info },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-6xl space-y-4 sm:space-y-6">
        {/* ---- who and what, with the primary action never behind a tab ---- */}
        <section className="card bg-base-200 border border-base-300">
          <div className="card-body p-4 sm:p-5 lg:p-6 gap-4">
            <div className="flex items-start gap-3">
              <button
                onClick={() => navigate("/rooms")}
                className="btn btn-ghost btn-sm btn-circle shrink-0"
                aria-label="Back to rooms"
              >
                <ArrowLeft className="size-4" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold tracking-tight truncate">
                  {room.name}
                </h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs sm:text-sm text-base-content/70">
                  <span className="inline-flex items-center gap-1.5">
                    {room.team ? (
                      <>
                        <Building2 className="size-3.5" />
                        <Link
                          to={`/teams/${room.team._id ?? room.team}`}
                          className="link link-hover"
                        >
                          {room.team.name}
                        </Link>
                      </>
                    ) : (
                      <>
                        <DoorOpen className="size-3.5" />
                        {needsApproval ? "Approval to join" : "Open to anyone"}
                      </>
                    )}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="size-3.5" />
                    {room.members.length}{" "}
                    {room.members.length === 1 ? "member" : "members"}
                  </span>
                  {atDesks.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-success font-medium">
                      <span className="relative flex size-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                        <span className="relative inline-flex size-2 rounded-full bg-success" />
                      </span>
                      {atDesks.length} at{" "}
                      {atDesks.length === 1 ? "a desk" : "their desks"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              {isMember || isCreator ? (
                <>
                  <button
                    onClick={() => navigate(`/rooms/${id}/stream`)}
                    className={`btn gap-2 flex-1 sm:flex-none ${
                      atADeskHere ? "btn-success" : "btn-primary"
                    }`}
                  >
                    <Video className="size-4" />
                    {atADeskHere ? "Back to your desk" : "Take a desk"}
                  </button>
                  <Link
                    to={`/chats?channel=room-${id}`}
                    className="btn btn-ghost gap-2 flex-1 sm:flex-none"
                  >
                    <MessagesSquare className="size-4" />
                    Room chat
                  </Link>
                </>
              ) : hasPendingRequest ? (
                <button className="btn btn-disabled flex-1 sm:flex-none">
                  Request pending
                </button>
              ) : (
                <button
                  onClick={() => mutations.requestJoin.mutate(id)}
                  className="btn btn-primary gap-2 flex-1 sm:flex-none"
                  disabled={mutations.requestJoin.isPending}
                >
                  {mutations.requestJoin.isPending ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    <UserPlus className="size-4" />
                  )}
                  {needsApproval ? "Ask to join" : "Join this room"}
                </button>
              )}
            </div>
          </div>
        </section>

        <div className="tabs tabs-box bg-base-200 p-1 inline-flex flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`tab tab-sm sm:tab-md gap-1.5 ${
                activeTab === tab.key ? "tab-active" : ""
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              <tab.icon className="size-4" />
              {tab.label}
              {tab.badge > 0 && (
                <span className="badge badge-primary badge-xs">
                  {tab.badge > 9 ? "9+" : tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ---- desks: who is here now, then what the room has done ---- */}
        {activeTab === "desks" && (
          <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2 space-y-4 sm:space-y-6 min-w-0">
              <section className="card bg-base-200 border border-base-300">
                <div className="card-body p-4 sm:p-5 gap-3">
                  <h2 className="font-semibold text-sm sm:text-base">
                    At their desks
                  </h2>

                  {!isMember && !isCreator ? (
                    <p className="text-sm text-base-content/60 py-2">
                      Join the room to see who is working and take a desk of
                      your own.
                    </p>
                  ) : atDesks.length > 0 ? (
                    <ul className="space-y-2">
                      {atDesks.map((stream) => (
                        <li
                          key={stream._id}
                          className="flex items-center gap-3 rounded-field bg-base-100 px-3 py-2.5"
                        >
                          <Link
                            to={`/profile/${stream.user._id}`}
                            className="shrink-0"
                          >
                            <img
                              src={stream.user.profilePic || "/blank-pp.png"}
                              alt=""
                              className="size-9 rounded-full object-cover ring-2 ring-success ring-offset-base-100 ring-offset-1"
                            />
                          </Link>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {stream.user.fullName}
                            </p>
                            <p className="text-xs text-base-content/60 truncate">
                              {stream.workTopic}
                            </p>
                          </div>
                          <span className="text-xs text-base-content/50 shrink-0 font-mono tabular-nums">
                            {format(new Date(stream.startedAt), "h:mm a")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-base-content/60 py-1">
                      Nobody is at a desk right now. Take one and the room is
                      open.
                    </p>
                  )}
                </div>
              </section>

              {sessionStats?.totalSessions > 0 && (
                <section className="card bg-base-200 border border-base-300">
                  <div className="card-body p-4 sm:p-5 gap-3">
                    <h2 className="font-semibold text-sm sm:text-base">
                      What this room has done
                    </h2>
                    <dl className="grid grid-cols-3 gap-3">
                      <div>
                        <dt className="text-xs text-base-content/60">
                          Hours logged
                        </dt>
                        <dd className="text-lg sm:text-xl font-bold font-mono tabular-nums">
                          {Math.round(sessionStats.totalHours)}h
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-base-content/60">
                          Sessions
                        </dt>
                        <dd className="text-lg sm:text-xl font-bold font-mono tabular-nums">
                          {sessionStats.totalSessions}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-base-content/60">
                          People
                        </dt>
                        <dd className="text-lg sm:text-xl font-bold font-mono tabular-nums">
                          {sessionStats.uniqueParticipants}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </section>
              )}
            </div>

            {(isMember || isCreator) && (
              <section className="card bg-base-200 border border-base-300 min-w-0">
                <div className="card-body p-4 sm:p-5 gap-3">
                  <h2 className="font-semibold text-sm sm:text-base">
                    Recent sessions
                  </h2>
                  {sessionStats?.recentSessions?.length > 0 ? (
                    <ul className="space-y-2">
                      {sessionStats.recentSessions.slice(0, 4).map((session) => {
                        const { hours, minutes } = minutesToHoursAndMinutes(
                          session.actualDuration
                        );
                        return (
                          <li
                            key={session._id}
                            className="rounded-field bg-base-100 p-3"
                          >
                            <div className="flex items-center gap-2.5">
                              <img
                                src={
                                  session.user.profilePic || "/blank-pp.png"
                                }
                                alt=""
                                className="size-8 rounded-full object-cover shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">
                                  {session.user.fullName}
                                </p>
                                <p className="text-xs text-base-content/60 truncate">
                                  {session.workTopic}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-2 text-xs text-base-content/60">
                              <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                                <Clock className="size-3.5" />
                                {hours}h {minutes}m
                              </span>
                              {session.totalTasks > 0 && (
                                <span className="inline-flex items-center gap-1">
                                  <ListTodo className="size-3.5" />
                                  {session.tasksCompleted}/{session.totalTasks}
                                </span>
                              )}
                              <span>
                                {format(new Date(session.endTime), "d MMM")}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-base-content/60 py-1">
                      No finished sessions yet. The first one shows up here.
                    </p>
                  )}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ---- members ---- */}
        {activeTab === "members" && (
          <div className="space-y-4 sm:space-y-6">
            {isCreator && room.pendingRequests?.length > 0 && (
              <section className="card bg-base-200 border border-base-300">
                <div className="card-body p-4 sm:p-5 gap-3">
                  <h2 className="font-semibold text-sm sm:text-base">
                    Waiting to join ({room.pendingRequests.length})
                  </h2>
                  <ul className="space-y-2">
                    {room.pendingRequests.map((user) => (
                      <li
                        key={user._id}
                        className="flex items-center gap-3 rounded-field bg-base-100 px-3 py-2.5"
                      >
                        <img
                          src={user.profilePic || "/blank-pp.png"}
                          alt=""
                          className="size-9 rounded-full object-cover shrink-0"
                        />
                        <p className="flex-1 min-w-0 text-sm font-medium truncate">
                          {user.fullName}
                        </p>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() =>
                              mutations.approve.mutate({
                                roomId: id,
                                userId: user._id,
                              })
                            }
                            className="btn btn-success btn-xs gap-1"
                            disabled={
                              mutations.approve.isPending ||
                              mutations.reject.isPending
                            }
                          >
                            {mutations.approve.isPending &&
                            mutations.approve.variables?.userId === user._id ? (
                              <span className="loading loading-spinner loading-xs" />
                            ) : (
                              <UserCheck className="size-3.5" />
                            )}
                            Let in
                          </button>
                          <button
                            onClick={() =>
                              mutations.reject.mutate({
                                roomId: id,
                                userId: user._id,
                              })
                            }
                            className="btn btn-ghost btn-xs gap-1"
                            disabled={
                              mutations.approve.isPending ||
                              mutations.reject.isPending
                            }
                            aria-label={`Decline ${user.fullName}`}
                          >
                            {mutations.reject.isPending &&
                            mutations.reject.variables?.userId === user._id ? (
                              <span className="loading loading-spinner loading-xs" />
                            ) : (
                              <UserX className="size-3.5" />
                            )}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            <section className="card bg-base-200 border border-base-300">
              <div className="card-body p-4 sm:p-5 gap-3">
                <h2 className="font-semibold text-sm sm:text-base">
                  Members ({room.members.length})
                </h2>
                <ul className="grid sm:grid-cols-2 gap-2">
                  {room.members.map((member) => (
                    <li key={member._id}>
                      <Link
                        to={`/profile/${member._id}`}
                        className="flex items-center gap-3 rounded-field bg-base-100 px-3 py-2.5 hover:bg-base-300 transition-colors"
                      >
                        <img
                          src={member.profilePic || "/blank-pp.png"}
                          alt=""
                          className="size-9 rounded-full object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">
                            {member.fullName}
                          </p>
                          {member.role && (
                            <p className="text-xs text-base-content/60 truncate">
                              {capitalize(member.role)}
                            </p>
                          )}
                        </div>
                        {member._id === room.creator?._id && (
                          <span className="badge badge-ghost badge-sm shrink-0">
                            Host
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        )}

        {/* ---- about ---- */}
        {activeTab === "about" && (
          <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
            <section className="lg:col-span-2 card bg-base-200 border border-base-300 min-w-0">
              <div className="card-body p-4 sm:p-5 gap-2">
                <h2 className="font-semibold text-sm sm:text-base">
                  About this room
                </h2>
                <p className="text-sm text-base-content/70 whitespace-pre-wrap">
                  {room.description}
                </p>
              </div>
            </section>

            <div className="space-y-4 sm:space-y-6 min-w-0">
              <section className="card bg-base-200 border border-base-300">
                <div className="card-body p-4 sm:p-5 gap-3">
                  <h2 className="font-semibold text-sm sm:text-base">Host</h2>
                  <Link
                    to={`/profile/${room.creator?._id}`}
                    className="flex items-center gap-3 rounded-field bg-base-100 px-3 py-2.5 hover:bg-base-300 transition-colors"
                  >
                    <img
                      src={room.creator?.profilePic || "/blank-pp.png"}
                      alt=""
                      className="size-11 rounded-full object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {room.creator?.fullName}
                      </p>
                      {room.creator?.role && (
                        <p className="text-xs text-base-content/60 truncate">
                          {capitalize(room.creator.role)}
                        </p>
                      )}
                    </div>
                  </Link>
                </div>
              </section>

              {(isCreator || isMember) && (
                <section className="card bg-base-200 border border-base-300">
                  <div className="card-body p-4 sm:p-5 gap-3">
                    {isCreator ? (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="btn btn-error btn-outline gap-2 w-full"
                      >
                        <Trash2 className="size-4" />
                        Delete room
                      </button>
                    ) : (
                      <button
                        onClick={() => mutations.leave.mutate(id)}
                        className="btn btn-error btn-outline gap-2 w-full"
                        disabled={mutations.leave.isPending}
                      >
                        {mutations.leave.isPending ? (
                          <span className="loading loading-spinner loading-sm" />
                        ) : (
                          <UserMinus className="size-4" />
                        )}
                        Leave room
                      </button>
                    )}
                  </div>
                </section>
              )}
            </div>
          </div>
        )}

        {/* ---- notices ---- */}
        {activeTab === "announcements" && (
          <div className="space-y-4">
            {isCreator && (
              <button
                onClick={() => setShowAnnouncementModal(true)}
                className="btn btn-primary btn-sm gap-2"
              >
                <Plus className="size-4" />
                Post a notice
              </button>
            )}
            {room.announcements?.length > 0 ? (
              <ul className="space-y-3">
                {room.announcements.map((announcement) => (
                  <li
                    key={announcement._id}
                    className="card bg-base-200 border border-base-300"
                  >
                    <div className="card-body p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold mb-1.5">
                            {announcement.title}
                          </h3>
                          <p className="text-sm text-base-content/80 whitespace-pre-wrap">
                            {announcement.content}
                          </p>
                          <div className="flex items-center gap-2 mt-3 text-xs text-base-content/60">
                            <img
                              src={
                                announcement.createdBy.profilePic ||
                                "/blank-pp.png"
                              }
                              alt=""
                              className="size-5 rounded-full object-cover"
                            />
                            <span>{announcement.createdBy.fullName}</span>
                            <span aria-hidden="true">·</span>
                            <span>
                              {format(
                                new Date(announcement.createdAt),
                                "d MMM yyyy"
                              )}
                            </span>
                          </div>
                        </div>
                        {isCreator && (
                          <button
                            onClick={() =>
                              mutations.deleteAnnouncement.mutate({
                                roomId: id,
                                announcementId: announcement._id,
                              })
                            }
                            className="btn btn-ghost btn-sm btn-circle shrink-0"
                            disabled={mutations.deleteAnnouncement.isPending}
                            aria-label="Delete notice"
                          >
                            {mutations.deleteAnnouncement.isPending &&
                            mutations.deleteAnnouncement.variables
                              ?.announcementId === announcement._id ? (
                              <span className="loading loading-spinner loading-xs" />
                            ) : (
                              <Trash className="size-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="card bg-base-200 border border-base-300">
                <div className="card-body p-6 items-center text-center gap-1">
                  <Megaphone className="size-8 text-base-content/30" />
                  <p className="text-sm text-base-content/60">
                    Nothing posted yet.
                  </p>
                  <p className="text-xs text-base-content/50">
                    Notices reach every member, unlike a message in the room
                    chat.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {showDeleteConfirm && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg mb-2">Delete this room?</h3>
              <p className="text-sm text-base-content/70 mb-4">
                Members lose access and the room chat goes with it. Sessions
                already logged are kept on each person&apos;s record.
              </p>
              <div className="modal-action">
                <button
                  className="btn btn-ghost"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={mutations.delete.isPending}
                >
                  Cancel
                </button>
                {/* The dialog used to close on click, so a slow delete looked
                    like nothing had happened. It now stays until the server
                    answers. */}
                <button
                  className="btn btn-error gap-2"
                  onClick={() => mutations.delete.mutate(id)}
                  disabled={mutations.delete.isPending}
                >
                  {mutations.delete.isPending && (
                    <span className="loading loading-spinner loading-xs" />
                  )}
                  {mutations.delete.isPending ? "Deleting..." : "Delete room"}
                </button>
              </div>
            </div>
            <div
              className="modal-backdrop"
              onClick={() => setShowDeleteConfirm(false)}
            />
          </div>
        )}

        {showAnnouncementModal && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg mb-1">Post a notice</h3>
              <p className="text-sm text-base-content/60 mb-4">
                Every member is notified.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  mutations.createAnnouncement.mutate({
                    roomId: id,
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
                    Message
                  </label>
                  <textarea
                    id="announcement-content"
                    className="textarea h-28 w-full"
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
                      <span className="loading loading-spinner loading-sm" />
                    ) : (
                      "Post notice"
                    )}
                  </button>
                </div>
              </form>
            </div>
            <div
              className="modal-backdrop"
              onClick={() => setShowAnnouncementModal(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomDetailPage;
