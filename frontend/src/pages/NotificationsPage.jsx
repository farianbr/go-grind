import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  X
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";

const NotificationsPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
  });

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
      // Remove the notification after accepting
      queryClient.setQueryData(["notifications"], (old) => 
        old?.filter(n => n.metadata?.friendRequestId !== friendRequestId)
      );
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
      // Remove the notification after declining
      queryClient.setQueryData(["notifications"], (old) => 
        old?.filter(n => n.metadata?.friendRequestId !== friendRequestId)
      );
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
        return <UserPlus className="size-5 text-primary" />;
      case "space_join_approved":
        return <UserCheck className="size-5 text-success" />;
      case "space_join_rejected":
        return <UserX className="size-5 text-error" />;
      case "session_started":
        return <Video className="size-5 text-info" />;
      case "session_reminder":
        return <Clock className="size-5 text-warning" />;
      case "removed_from_stream":
        return <UserX className="size-5 text-error" />;
      default:
        return <Bell className="size-5" />;
    }
  };

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-base-content/60 mt-1">
                You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {notifications && notifications.length > 0 && unreadCount > 0 && (
            <button
              onClick={() => markAllAsReadMutation()}
              className="btn btn-sm btn-ghost gap-2"
            >
              <CheckCheck className="size-4" />
              Mark all as read
            </button>
          )}
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : notifications && notifications.length > 0 ? (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification._id}
                className={`card bg-base-200 hover:bg-base-300 transition-all cursor-pointer ${
                  !notification.read ? 'border-l-4 border-primary' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="card-body p-4">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Sender Avatar */}
                    <div className="avatar flex-shrink-0">
                      <div className="w-10 h-10 rounded-full">
                        <img
                          src={notification.sender?.profilePic || "/avatar.png"}
                          alt={notification.sender?.fullName || "User"}
                        />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.read ? 'font-semibold' : ''}`}>
                        {notification.message}
                      </p>
                      
                      {notification.relatedSpace && (
                        <p className="text-xs text-primary mt-1">
                          {notification.relatedSpace.name}
                        </p>
                      )}

                      <p className="text-xs text-base-content/50 mt-2">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>

                      {/* Friend Request Actions */}
                      {notification.type === "friend_request" && 
                       notification.metadata?.friendRequestId && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              acceptFriendRequestMutation(notification.metadata.friendRequestId);
                            }}
                            className="btn btn-sm btn-success gap-2"
                            disabled={isAccepting || isDeclining}
                          >
                            {isAccepting ? (
                              <span className="loading loading-spinner loading-xs"></span>
                            ) : (
                              <Check className="size-4" />
                            )}
                            Accept
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              declineFriendRequestMutation(notification.metadata.friendRequestId);
                            }}
                            className="btn btn-sm btn-error gap-2"
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
                      )}
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotificationMutation(notification._id);
                      }}
                      className="btn btn-ghost btn-sm btn-circle"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <Bell className="size-16 text-base-content/20 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No notifications yet</h3>
            <p className="text-base-content/60 text-center max-w-md">
              You'll see notifications here when you receive space invites, session updates, and more.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;