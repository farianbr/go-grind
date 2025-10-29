import { Link, useNavigate } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { BellIcon, LogOutIcon, Airplay, User, ChevronDown } from "lucide-react";
import useLogout from "../hooks/useLogout";
import ThemeSelector from "./ThemeSelector";
import FloatingSideBar from "./FloatingSideBar";
import { useNotificationUnreadCount } from "../hooks/useNotificationUnreadCount";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getNotifications } from "../lib/api";
import { formatDistanceToNow } from "date-fns";

const Navbar = () => {
  const { authUser } = useAuthUser();
  const navigate = useNavigate();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const profileDropdownRef = useRef(null);
  const notificationDropdownRef = useRef(null);

  const { logoutMutation } = useLogout();

  // Use the unread count hook
  const unreadCount = useNotificationUnreadCount();

  // Fetch recent notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
  });

  // Get recent 5 notifications
  const recentNotifications = notifications.slice(0, 5);

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

  return (
    <nav className="bg-base-200 border-b border-base-300 sticky top-0 z-30 h-12 sm:h-16 flex items-center">
      <div className="w-full px-2 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between w-full">
          {/* Logo - visible on mobile */}
          <div className="lg:hidden shrink-0">
            <Link to="/" className="flex items-center gap-1.5 sm:gap-2.5">
              <Airplay className="size-6 sm:size-9 text-primary" />
              <span className="text-xl sm:text-3xl font-bold font-mono bg-clip-text text-transparent bg-linear-to-r from-primary to-secondary tracking-wider">
                GoGrind
              </span>
            </Link>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 lg:ml-auto">
            {/* Mobile sidebar toggle */}
            <FloatingSideBar />
            
            {/* Notifications Button with Dropdown */}
            <div className="relative" ref={notificationDropdownRef}>
              <button
                className="btn btn-circle bg-base-100 hover:bg-base-300 border-0 w-8 h-8 min-h-8 sm:w-10 sm:h-10 sm:min-h-10 relative"
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
              >
                <BellIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 sm:top-0 sm:right-0 badge badge-primary badge-xs sm:badge-sm min-h-4 h-4 sm:min-h-5 sm:h-5 px-1 sm:px-1.5">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotificationDropdown && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-base-100 rounded-lg shadow-xl border border-base-300 z-50 max-h-96 overflow-hidden flex flex-col">
                  <div className="px-4 py-3 border-b border-base-300 flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="badge badge-primary badge-sm">
                        {unreadCount} new
                      </span>
                    )}
                  </div>

                  {/* Notifications List */}
                  <div className="overflow-y-auto flex-1">
                    {recentNotifications.length > 0 ? (
                      recentNotifications.map((notification) => (
                        <Link
                          key={notification._id}
                          to="/notifications"
                          onClick={() => setShowNotificationDropdown(false)}
                          className={`block px-4 py-3 hover:bg-base-200 transition-colors border-b border-base-300 last:border-b-0 ${
                            !notification.read ? "bg-primary/5" : ""
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="avatar">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full">
                                <img
                                  src={notification.sender?.profilePic}
                                  alt={notification.sender?.fullName}
                                  className="rounded-full object-cover"
                                />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm line-clamp-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-base-content/60 mt-1">
                                {formatDistanceToNow(new Date(notification.createdAt), {
                                  addSuffix: true,
                                })}
                              </p>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1"></div>
                            )}
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center text-base-content/60">
                        <BellIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No notifications yet</p>
                      </div>
                    )}
                  </div>

                  {/* See All Button */}
                  {notifications.length > 0 && (
                    <div className="px-4 py-3 border-t border-base-300">
                      <button
                        onClick={handleSeeAllNotifications}
                        className="btn btn-sm btn-block btn-ghost gap-2"
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
                className="btn bg-base-100 hover:bg-base-300 border-0 rounded-full h-8 min-h-8 sm:h-10 sm:min-h-10 pl-1 pr-2 sm:pl-1 sm:pr-3 flex items-center gap-1"
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              >
                <div className="avatar">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full">
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
