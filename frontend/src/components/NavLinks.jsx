import { Link, useLocation } from "react-router";
import { BellIcon, HomeIcon, UsersIcon, MessagesSquare } from "lucide-react";

const NavLinks = () => {
  const location = useLocation();
  const currentPath = location.pathname;
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
          currentPath === "/chats" ? "btn-active" : ""
        }`}
      >
        <MessagesSquare className="size-5 text-base-content opacity-70" />
        <span>Chats</span>
      </Link>

      <Link
        to="/notifications"
        className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${
          currentPath === "/notifications" ? "btn-active" : ""
        }`}
      >
        <BellIcon className="size-5 text-base-content opacity-70" />
        <span>Notifications</span>
      </Link>
    </>
  );
};

export default NavLinks;
