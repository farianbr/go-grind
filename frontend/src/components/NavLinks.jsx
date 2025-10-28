import { Link, useLocation } from "react-router";
import { BellIcon, HomeIcon, UsersIcon, MessagesSquare, Shapes } from "lucide-react";
import { useChatUnreadCount } from "../hooks/useChatUnreadCount";
import { useNotificationUnreadCount } from "../hooks/useNotificationUnreadCount";

const NavLinks = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const unreadChatCount = useChatUnreadCount();
  const unreadNotificationCount = useNotificationUnreadCount();
  
  return (
    <>
      <Link
        to="/"
        className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${
          currentPath === "/" ? "btn-active" : ""
        }`}
      >
        <HomeIcon className="size-5 text-base-content opacity-70" />
        <span>Home</span>
      </Link>

      <Link
        to="/spaces"
        className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${
          currentPath === "/spaces" || currentPath.startsWith("/spaces/") ? "btn-active" : ""
        }`}
      >
        <Shapes className="size-5 text-base-content opacity-70" />
        <span>Spaces</span>
      </Link>

      <Link
        to="/friends"
        className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${
          currentPath === "/friends" ? "btn-active" : ""
        }`}
      >
        <UsersIcon className="size-5 text-base-content opacity-70" />
        <span>Friends</span>
      </Link>

      <Link
        to="/chats"
        className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${
          currentPath === "/chats" || currentPath.startsWith("/chats/") ? "btn-active" : ""
        }`}
      >
        <MessagesSquare className="size-5 text-base-content opacity-70" />
        <div className="flex items-center gap-2">
          <span>Chats</span>
          {unreadChatCount > 0 && (
            <span className="badge badge-primary badge-sm">
              {unreadChatCount > 9 ? "9+" : unreadChatCount}
            </span>
          )}
        </div>
      </Link>

      <Link
        to="/notifications"
        className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${
          currentPath === "/notifications" ? "btn-active" : ""
        }`}
      >
        <BellIcon className="size-5 text-base-content opacity-70" />
        <div className="flex items-center gap-2">
          <span>Notifications</span>
          {unreadNotificationCount > 0 && (
            <span className="badge badge-primary badge-sm">
              {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
            </span>
          )}
        </div>
      </Link>
    </>
  );
};

export default NavLinks;
