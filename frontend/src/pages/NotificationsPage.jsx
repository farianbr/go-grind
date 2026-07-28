import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { 
  getNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification,
  acceptFriendRequest,
  declineFriendRequest
} from "../lib/api";
import { 
  Bell, 
  UserPlus, 
  UserCheck, 
  UserX, 
  Video, 
  Clock, 
  Trash2,
  CheckCheck,
  Check,
  X,
  Users,
  ShieldCheck,
  ShieldX,
  Megaphone,
  Heart,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";

const NotificationsPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 20;

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ["notifications", currentPage],
    queryFn: () => getNotifications(currentPage, limit),
  });

  const notifications = notificationsData?.notifications || [];
  const totalPages = notificationsData?.totalPages || 1;

  const { mutate: markAsReadMutation } = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unreadCount"] });
      queryClient.invalidateQueries({ queryKey: ["notificationUnreadCount"] });
    },
  });

  const { mutate: markAllAsReadMutation, isPending: isMarkingAll } = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      toast.success("All notifications marked as read");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unreadCount"] });
      queryClient.invalidateQueries({ queryKey: ["notificationUnreadCount"] });
    },
  });

  // `variables` is the notification id, so only the row being deleted spins.
  const {
    mutate: deleteNotificationMutation,
    isPending: isDeleting,
    variables: deletingId,
  } = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      toast.success("Notification deleted");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unreadCount"] });
      queryClient.invalidateQueries({ queryKey: ["notificationUnreadCount"] });
    },
  });

  const {
    mutate: acceptFriendRequestMutation,
    isPending: isAccepting,
    variables: acceptingId,
  } = useMutation({
    mutationFn: acceptFriendRequest,
    onSuccess: (_, friendRequestId) => {
      toast.success("Friend request accepted");
      
      const notificationToMark = notifications.find(
        n => n.metadata?.friendRequestId === friendRequestId && !n.read
      );
      if (notificationToMark) {
        markAsReadMutation(notificationToMark._id);
      }
      
      queryClient.setQueryData(["notifications", currentPage], (old) => {
        if (!old) return old;
        return {
          ...old,
          notifications: old.notifications?.filter(n => n.metadata?.friendRequestId !== friendRequestId) || []
        };
      });
      
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
      queryClient.invalidateQueries({ queryKey: ["notificationUnreadCount"] });
    },
  });

  const {
    mutate: declineFriendRequestMutation,
    isPending: isDeclining,
    variables: decliningId,
  } = useMutation({
    mutationFn: declineFriendRequest,
    onSuccess: (_, friendRequestId) => {
      toast.success("Friend request declined");
      
      const notificationToMark = notifications.find(
        n => n.metadata?.friendRequestId === friendRequestId && !n.read
      );
      if (notificationToMark) {
        markAsReadMutation(notificationToMark._id);
      }
      
      queryClient.setQueryData(["notifications", currentPage], (old) => {
        if (!old) return old;
        return {
          ...old,
          notifications: old.notifications?.filter(n => n.metadata?.friendRequestId !== friendRequestId) || []
        };
      });
      
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
      queryClient.invalidateQueries({ queryKey: ["notificationUnreadCount"] });
    },
  });

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsReadMutation(notification._id);
    }

    if (notification.relatedRoom) {
      navigate(`/rooms/${notification.relatedRoom._id}`);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "friend_request":
        return <UserPlus className="size-3 text-primary" />;
      case "friend_request_accepted":
        return <UserCheck className="size-3 text-success" />;
      case "room_join_request":
        return <Users className="size-3 text-info" />;
      case "room_join_approved":
        return <ShieldCheck className="size-3 text-success" />;
      case "room_join_rejected":
        return <ShieldX className="size-3 text-error" />;
      case "session_started":
        return <Video className="size-3 text-secondary" />;
      case "session_reminder":
        return <Clock className="size-3 text-warning" />;
      case "removed_from_stream":
        return <UserX className="size-3 text-error" />;
      case "announcement":
        return <Megaphone className="size-3 text-accent" />;
      case "encouragement":
        return <Heart className="size-3 text-error" />;
      default:
        return <Bell className="size-3" />;
    }
  };

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="container mx-auto max-w-3xl">
        <header className="flex flex-wrap items-end justify-between gap-3 pb-4 mb-1 border-b border-base-300">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Notifications
            </h1>
            <p className="text-sm text-base-content/60 mt-1">
              {unreadCount > 0
                ? `${unreadCount} unread`
                : "Join requests, room notices and nudges from the people you work with"}
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsReadMutation()}
              className="btn btn-sm btn-ghost gap-2"
              disabled={isMarkingAll}
            >
              {isMarkingAll ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <CheckCheck className="size-4" />
              )}
              Mark all read
            </button>
          )}
        </header>

        {isLoading ? (
          <div className="divide-y divide-base-300">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 py-4">
                <div className="skeleton size-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 w-3/4" />
                  <div className="skeleton h-2.5 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications && notifications.length > 0 ? (
          /* A list, not a stack of cards: these are one-line events and card
             chrome on each of them buries the only thing that varies. */
          <ul className="divide-y divide-base-300">
            {notifications.map((notification) => (
              <li
                key={notification._id}
                className={`group -mx-3 px-3 transition-colors cursor-pointer hover:bg-base-200 ${
                  !notification.read ? "bg-primary/5" : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="py-3.5">
                  <div className="flex items-start gap-3">
                    {/* One avatar carrying its own type badge, rather than an
                        icon and a photo competing side by side. */}
                    <div className="relative shrink-0">
                      <img
                        src={notification.sender?.profilePic || "/blank-pp.png"}
                        alt=""
                        className="size-9 sm:size-10 rounded-full object-cover"
                      />
                      <span className="absolute -bottom-1 -right-1 grid place-items-center size-5 rounded-full bg-base-100 ring-1 ring-base-300">
                        {getNotificationIcon(notification.type)}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm ${
                          !notification.read ? "font-semibold" : ""
                        }`}
                      >
                        {notification.type === "encouragement" &&
                          `${notification.sender?.fullName} `}
                        {notification.message}
                      </p>

                      <p className="text-xs text-base-content/50 mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                        {notification.relatedRoom && (
                          <>
                            <span aria-hidden="true"> · </span>
                            <span className="text-base-content/70">
                              {notification.relatedRoom.name}
                            </span>
                          </>
                        )}
                      </p>

                      {notification.type === "friend_request" &&
                        notification.metadata?.friendRequestId && (
                          <div className="flex gap-2 mt-2.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                acceptFriendRequestMutation(
                                  notification.metadata.friendRequestId
                                );
                              }}
                              className="btn btn-xs btn-primary gap-1.5"
                              disabled={isAccepting || isDeclining}
                            >
                              {isAccepting &&
                              acceptingId ===
                                notification.metadata.friendRequestId ? (
                                <span className="loading loading-spinner loading-xs" />
                              ) : (
                                <Check className="size-3.5" />
                              )}
                              Accept
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                declineFriendRequestMutation(
                                  notification.metadata.friendRequestId
                                );
                              }}
                              className="btn btn-xs btn-ghost gap-1.5"
                              disabled={isAccepting || isDeclining}
                            >
                              {isDeclining &&
                              decliningId ===
                                notification.metadata.friendRequestId ? (
                                <span className="loading loading-spinner loading-xs" />
                              ) : (
                                <X className="size-3.5" />
                              )}
                              Decline
                            </button>
                          </div>
                        )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotificationMutation(notification._id);
                      }}
                      className={`btn btn-ghost btn-xs btn-circle shrink-0 transition-opacity ${
                        isDeleting && deletingId === notification._id
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                      }`}
                      disabled={isDeleting && deletingId === notification._id}
                      aria-label="Delete notification"
                    >
                      {isDeleting && deletingId === notification._id ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="size-10 text-base-content/20 mb-3" />
            <h2 className="text-lg font-semibold mb-1">
              Nothing to catch up on
            </h2>
            <p className="text-sm text-base-content/60 max-w-sm">
              Join requests, room notices and nudges from the people you work
              with land here.
            </p>
          </div>
        )}

        {notifications && notifications.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="btn btn-sm btn-outline gap-2"
            >
              <ChevronLeft className="size-4" />
              Previous
            </button>
            
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`btn btn-sm ${
                      currentPage === pageNum ? "btn-primary" : "btn-ghost"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="btn btn-sm btn-outline gap-2"
            >
              Next
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
