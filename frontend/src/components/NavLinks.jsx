import { Link, useLocation } from "react-router";
import { BellIcon, HomeIcon, UsersIcon, MessagesSquare, Shapes, Timer, Building2 } from "lucide-react";
import { useChatUnreadCount } from "../hooks/useChatUnreadCount";
import useActiveSession from "../hooks/useActiveSession";

const NavLinks = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const unreadChatCount = useChatUnreadCount();
  const { isActive: sessionActive, onBreak } = useActiveSession();
  
  return (
    <>
      <Link
        to="/"
        className={`btn btn-ghost justify-start w-full gap-2 lg:gap-3 px-2 lg:px-3 normal-case text-sm lg:text-base ${
          currentPath === "/" ? "btn-active" : ""
        }`}
      >
        <HomeIcon className="size-4 lg:size-5 text-base-content opacity-70" />
        <span>Home</span>
      </Link>

      <Link
        to="/focus"
        className={`btn btn-ghost justify-start w-full gap-2 lg:gap-3 px-2 lg:px-3 normal-case text-sm lg:text-base ${
          currentPath === "/focus" ? "btn-active" : ""
        }`}
      >
        <Timer className="size-4 lg:size-5 text-base-content opacity-70" />
        <div className="flex items-center gap-1.5 lg:gap-2">
          <span>Session</span>
          {sessionActive && (
            <span
              className={
                onBreak
                  ? "inline-flex size-2 rounded-full bg-warning"
                  : "inline-flex size-2 rounded-full bg-primary animate-pulse"
              }
              title={onBreak ? "On a break" : "Session in progress"}
            />
          )}
        </div>
      </Link>

      <Link
        to="/rooms"
        className={`btn btn-ghost justify-start w-full gap-2 lg:gap-3 px-2 lg:px-3 normal-case text-sm lg:text-base ${
          currentPath === "/rooms" || currentPath.startsWith("/rooms/") ? "btn-active" : ""
        }`}
      >
        <Shapes className="size-4 lg:size-5 text-base-content opacity-70" />
        <span>Rooms</span>
      </Link>

      <Link
        to="/teams"
        className={`btn btn-ghost justify-start w-full gap-2 lg:gap-3 px-2 lg:px-3 normal-case text-sm lg:text-base ${
          currentPath === "/teams" || currentPath.startsWith("/teams/") ? "btn-active" : ""
        }`}
      >
        <Building2 className="size-4 lg:size-5 text-base-content opacity-70" />
        <span>Teams</span>
      </Link>

      <Link
        to="/friends"
        className={`btn btn-ghost justify-start w-full gap-2 lg:gap-3 px-2 lg:px-3 normal-case text-sm lg:text-base ${
          currentPath === "/friends" ? "btn-active" : ""
        }`}
      >
        <UsersIcon className="size-4 lg:size-5 text-base-content opacity-70" />
        <span>People</span>
      </Link>

      <Link
        to="/chats"
        className={`btn btn-ghost justify-start w-full gap-2 lg:gap-3 px-2 lg:px-3 normal-case text-sm lg:text-base ${
          currentPath === "/chats" || currentPath.startsWith("/chats/") ? "btn-active" : ""
        }`}
      >
        <MessagesSquare className="size-4 lg:size-5 text-base-content opacity-70" />
        <div className="flex items-center gap-1 lg:gap-2">
          <span>Chats</span>
          {unreadChatCount > 0 && (
            <span
              className="inline-flex size-2 rounded-full bg-primary"
              title="Unread messages"
            />
          )}
        </div>
      </Link>

      <Link
        to="/notifications"
        className={`btn btn-ghost justify-start w-full gap-2 lg:gap-3 px-2 lg:px-3 normal-case text-sm lg:text-base ${
          currentPath === "/notifications" ? "btn-active" : ""
        }`}
      >
        <BellIcon className="size-4 lg:size-5 text-base-content opacity-70" />
        <span>Notifications</span>
      </Link>
    </>
  );
};

export default NavLinks;
