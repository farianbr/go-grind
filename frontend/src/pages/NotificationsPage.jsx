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

  const { mutate: markAllAsReadMutation } = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      toast.success("All notifications marked as read");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unreadCount"] });
      queryClient.invalidateQueries({ queryKey: ["notificationUnreadCount"] });
    },
  });

  const { mutate: deleteNotificationMutation } = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      toast.success("Notification deleted");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unreadCount"] });
      queryClient.invalidateQueries({ queryKey: ["notificationUnreadCount"] });
    },
  });

  const { mutate: acceptFriendRequestMutation, isPending: isAccepting } = useMutation({
    mutationFn: acceptFriendRequest,
    onSuccess: (_, friendRequestId) => {
      toast.success("Friend request accepted");
      
      // Find and mark the notification as read before removing
      const notificationToMark = notifications.find(
        n => n.metadata?.friendRequestId === friendRequestId && !n.read
      );
      if (notificationToMark) {
        markAsReadMutation(notificationToMark._id);
      }
      
      // Immediately update the UI by filtering out the notification
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

  const { mutate: declineFriendRequestMutation, isPending: isDeclining } = useMutation({
    mutationFn: declineFriendRequest,
    onSuccess: (_, friendRequestId) => {
      toast.success("Friend request declined");
      
      // Find and mark the notification as read before removing
      const notificationToMark = notifications.find(
        n => n.metadata?.friendRequestId === friendRequestId && !n.read
      );
      if (notificationToMark) {
        markAsReadMutation(notificationToMark._id);
      }
      
      // Immediately update the UI by filtering out the notification
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
    // Mark as read
    if (!notification.read) {
      markAsReadMutation(notification._id);
    }

    // Navigate based on notification type
    if (notification.relatedSpace) {
      navigate(`/spaces/${notification.relatedSpace._id}`);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "friend_request":
        return <UserPlus className="size-5 text-primary" />;
      case "friend_request_accepted":
        return <UserCheck className="size-5 text-success" />;
      case "space_join_request":
        return <Users className="size-5 text-info" />;
      case "space_join_approved":
        return <ShieldCheck className="size-5 text-success" />;
      case "space_join_rejected":
        return <ShieldX className="size-5 text-error" />;
      case "session_started":
        return <Video className="size-5 text-secondary" />;
      case "session_reminder":
        return <Clock className="size-5 text-warning" />;
      case "removed_from_stream":
        return <UserX className="size-5 text-error" />;
      case "announcement":
        return <Megaphone className="size-5 text-accent" />;
      case "encouragement":
        return <Heart className="size-5 text-error" />;
      default:
        return <Bell className="size-5" />;
    }
  };

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-xs sm:text-sm text-base-content/60 mt-1">
                You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {notifications && notifications.length > 0 && unreadCount > 0 && (
            <button
              onClick={() => markAllAsReadMutation()}
              className="btn btn-xs sm:btn-sm btn-ghost gap-2 w-full sm:w-auto"
            >
              <CheckCheck className="size-3 sm:size-4" />
              Mark all as read
            </button>
          )}
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="flex justify-center py-8 sm:py-12">
            <span className="loading loading-spinner loading-md sm:loading-lg"></span>
          </div>
        ) : notifications && notifications.length > 0 ? (
          <div className="space-y-2 sm:space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification._id}
                className={`card bg-base-200 hover:bg-base-300 transition-all cursor-pointer ${
                  !notification.read ? 'border-l-4 border-primary' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="card-body p-3 sm:p-4">
                  <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                    {/* Icon */}
                    <div className="shrink-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center">
                        {getNotificationIcon(notification.type)}
                      </div>
                    </div>

                    {/* Sender Avatar */}
                    <div className="avatar shrink-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full">
                        <img
                          src={notification.sender?.profilePic || "/avatar.png"}
                          alt={notification.sender?.fullName || "User"}
                        />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs sm:text-sm ${!notification.read ? 'font-semibold' : ''}`}>
                        {notification.type === "encouragement" && `${notification.sender?.fullName} ` }{notification.message}
                      </p>
                      
                      {notification.relatedSpace && (
                        <p className="text-[10px] sm:text-xs text-primary mt-1">
                          {notification.relatedSpace.name}
                        </p>
                      )}

                      <p className="text-[10px] sm:text-xs text-base-content/50 mt-1 sm:mt-2">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>

                      {/* Friend Request Actions */}
                      {notification.type === "friend_request" && 
                       notification.metadata?.friendRequestId && (
                        <div className="flex gap-2 mt-2 sm:mt-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              acceptFriendRequestMutation(notification.metadata.friendRequestId);
                            }}
                            className="btn btn-xs sm:btn-sm btn-success gap-1 sm:gap-2"
                            disabled={isAccepting || isDeclining}
                          >
                            {isAccepting ? (
                              <span className="loading loading-spinner loading-xs"></span>
                            ) : (
                              <Check className="size-3 sm:size-4" />
                            )}
                            Accept
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              declineFriendRequestMutation(notification.metadata.friendRequestId);
                            }}
                            className="btn btn-xs sm:btn-sm btn-error gap-1 sm:gap-2"
                            disabled={isAccepting || isDeclining}
                          >
                            {isDeclining ? (
                              <span className="loading loading-spinner loading-xs"></span>
                            ) : (
                              <X className="size-3 sm:size-4" />
                            )}
                            Decline
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotificationMutation(notification._id);
                      }}
                      className="btn btn-ghost btn-xs sm:btn-sm btn-circle"
                    >
                      <Trash2 className="size-3 sm:size-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 sm:py-16">
            <Bell className="size-12 sm:size-14 md:size-16 text-base-content/20 mb-3 sm:mb-4" />
            <h3 className="text-lg sm:text-xl md:text-2xl font-semibold mb-1 sm:mb-2">No notifications yet</h3>
            <p className="text-xs sm:text-sm md:text-base text-base-content/60 text-center max-w-md px-4">
              You'll see notifications here when you receive space invites, session updates, and more.
            </p>
          </div>
        )}

        {/* Pagination Controls */}
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
