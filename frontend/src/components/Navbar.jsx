import { Link, useNavigate } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { BellIcon, LogOutIcon, User, ChevronDown, CheckCheck } from "lucide-react";
import useLogout from "../hooks/useLogout";
import ThemeSelector from "./ThemeSelector";
import FloatingSideBar from "./FloatingSideBar";
import { useNotificationUnreadCount } from "../hooks/useNotificationUnreadCount";
import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getNotifications, markAllNotificationsAsRead } from "../lib/api";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

const Navbar = () => {
  const { authUser } = useAuthUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const profileDropdownRef = useRef(null);
  const notificationDropdownRef = useRef(null);

  const { logoutMutation } = useLogout();

  // Use the unread count hook
  const unreadCount = useNotificationUnreadCount();

  // Fetch recent notifications with polling for real-time updates
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
    refetchInterval: 5000, // Poll every 5 seconds
    refetchIntervalInBackground: false, // Only poll when tab is active
  });

  // Mark all as read mutation
  const { mutate: markAllAsReadMutation, isPending: isMarkingAllAsRead } = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      toast.success("All notifications marked as read");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notificationUnreadCount"] });
    },
  });


  // Get recent 5 notifications
  const recentNotifications = notifications?.notifications?.slice(0, 5);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)) {
        setShowNotificationDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setShowProfileDropdown(false);
    logoutMutation();
  };

  const handleProfileClick = () => {
    setShowProfileDropdown(false);
    navigate("/profile");
  };

  const handleSeeAllNotifications = () => {
    setShowNotificationDropdown(false);
    navigate("/notifications");
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation();
  };

  return (
    <nav className="bg-base-200 border-b border-base-300 fixed top-0 left-0 right-0 z-30 h-16 flex items-center">
      <div className="w-full px-2 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between w-full gap-2 sm:gap-4">
          {/* Logo - responsive sizing */}
          <div className="shrink-0 min-w-0">
            <Link to="/" className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5">
              <img src="/go-grind-logo.png" alt="GoGrind" className="w-8 h-8 sm:w-10 sm:h-10" />
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold font-mono bg-clip-text text-transparent bg-linear-to-r from-primary to-secondary tracking-wider truncate">
                GoGrind
              </span>
            </Link>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Mobile sidebar toggle */}
            <FloatingSideBar />
            
            {/* Notifications Button with Dropdown */}
            <div className="relative" ref={notificationDropdownRef}>
              <button
                className="btn btn-circle bg-base-100 hover:bg-base-300 border-0 w-9 h-9 min-h-9 sm:w-10 sm:h-10 sm:min-h-10 relative"
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
              >
                <BellIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 sm:top-0 sm:right-0 badge badge-primary badge-xs sm:badge-sm min-h-4 h-4 sm:min-h-5 sm:h-5 px-1 sm:px-1.5 text-[10px] sm:text-xs">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotificationDropdown && (
                <div className="absolute -right-20 mt-2 w-[calc(100vw-3rem)] sm:w-80 md:w-96  bg-base-100 rounded-lg shadow-xl border border-base-300 z-50 max-h-[70vh] sm:max-h-96 overflow-hidden flex flex-col">
                  <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-base-300 flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-xs sm:text-sm">Notifications</h3>
                    <div className="flex items-center gap-1 sm:gap-2">
                      {unreadCount > 0 && (
                        <>
                          <span className="badge badge-primary badge-xs sm:badge-sm text-[10px] sm:text-xs">
                            {unreadCount} new
                          </span>
                          <button
                            onClick={handleMarkAllAsRead}
                            disabled={isMarkingAllAsRead}
                            className="btn btn-ghost btn-xs gap-1 text-[10px] sm:text-xs"
                            title="Mark all as read"
                          >
                            <CheckCheck className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden xs:inline">Read All</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Notifications List */}
                  <div className="overflow-y-auto flex-1">
                    {recentNotifications.length > 0 ? (
                      recentNotifications.map((notification) => (
                        <Link
                          key={notification._id}
                          to="/notifications"
                          onClick={() => setShowNotificationDropdown(false)}
                          className={`block px-3 sm:px-4 py-2 sm:py-3 hover:bg-base-200 transition-colors border-b border-base-300 last:border-b-0 ${
                            !notification.read ? "bg-primary/5" : ""
                          }`}
                        >
                          <div className="flex items-start gap-2 sm:gap-3">
                            <div className="avatar shrink-0">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full">
                                <img
                                  src={notification.sender?.profilePic}
                                  alt={notification.sender?.fullName}
                                  className="rounded-full object-cover"
                                />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-sm line-clamp-2">
                                {notification.type === "encouragement" && `${notification.sender?.fullName} `}
                                {notification.message}
                              </p>
                              <p className="text-[10px] sm:text-xs text-base-content/60 mt-1">
                                {formatDistanceToNow(new Date(notification.createdAt), {
                                  addSuffix: true,
                                })}
                              </p>
                            </div>
                            {!notification.read && (
                              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full shrink-0 mt-1"></div>
                            )}
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="px-3 sm:px-4 py-6 sm:py-8 text-center text-base-content/60">
                        <BellIcon className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-30" />
                        <p className="text-xs sm:text-sm">No notifications yet</p>
                      </div>
                    )}
                  </div>

                  {/* See All Button */}
                  {notifications?.notifications.length > 0 && (
                    <div className="px-3 sm:px-4 py-2 sm:py-3 border-t border-base-300">
                      <button
                        onClick={handleSeeAllNotifications}
                        className="btn btn-xs sm:btn-sm btn-block btn-ghost gap-2 text-xs sm:text-sm"
                      >
                        See All Notifications
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <ThemeSelector />

            {/* Profile Dropdown */}
            <div className="relative" ref={profileDropdownRef}>
              <button
                className="btn bg-base-100 hover:bg-base-300 border-0 rounded-full h-9 min-h-9 sm:h-10 sm:min-h-10 pl-1 pr-2 sm:pr-3 flex items-center gap-1"
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              >
                <div className="avatar">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full">
                    <img
                      src={authUser?.profilePic}
                      alt="User Avatar"
                      className="rounded-full object-cover"
                    />
                  </div>
                </div>
                <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>

              {/* Dropdown Menu */}
              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-48 sm:w-56 bg-base-100 rounded-lg shadow-xl border border-base-300 z-50 py-2">
                  <div className="px-4 pt-2 pb-4 border-b border-base-300">
                    <p className="font-semibold text-sm truncate">
                      {authUser?.fullName}
                    </p>
                    <p className="text-xs text-base-content/60 truncate">
                      {authUser?.email}
                    </p>
                  </div>

                  <button
                    onClick={handleProfileClick}
                    className="w-full px-4 py-2 mt-2 text-left hover:bg-base-200 transition-colors flex items-center gap-2 text-sm"
                  >
                    <User className="size-4" />
                    <span>My Profile</span>
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left hover:bg-base-200 transition-colors flex items-center gap-2 text-sm text-error"
                  >
                    <LogOutIcon className="size-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
export default Navbar;
