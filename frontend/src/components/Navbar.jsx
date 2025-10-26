import { Link, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import useAuthUser from "../hooks/useAuthUser";
import { BellIcon, LogOutIcon, Airplay } from "lucide-react";
import useLogout from "../hooks/useLogout";
import ThemeSelector from "./ThemeSelector";
import FloatingSideBar from "./FloatingSideBar";
import { getNotifications } from "../lib/api";

const Navbar = () => {
  const { authUser } = useAuthUser();
  const navigate = useNavigate();

  const { logoutMutation } = useLogout();

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
    enabled: !!authUser,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Count unread notifications
  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  return (
    <nav className="bg-base-200 border-b border-base-300 sticky top-0 z-30 h-16 flex items-center">
      <div className="w-full px-2 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between w-full">
          {/* Logo - visible on mobile */}
          <div className="lg:hidden flex-shrink-0">
            <Link to="/" className="flex items-center gap-1.5 sm:gap-2.5">
              <Airplay className="size-6 sm:size-9 text-primary" />
              <span className="text-xl sm:text-3xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary tracking-wider">
                GoGrind
              </span>
            </Link>
          </div>

          {/* Mobile sidebar toggle */}
          <FloatingSideBar />

          {/* Right side controls */}
          <div className="flex items-center gap-1 sm:gap-2 lg:ml-auto">
            <Link to={"/notifications"}>
              <button className="btn btn-ghost btn-circle btn-sm sm:btn-md relative">
                <BellIcon className="h-4 w-4 sm:h-6 sm:w-6 text-base-content opacity-70" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 sm:top-1 sm:right-1 badge badge-primary badge-xs sm:badge-sm">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </Link>

            <ThemeSelector />

            <button
              className="btn btn-ghost btn-circle btn-sm sm:btn-md"
              onClick={() => navigate("/update-profile")}
            >
              <img
                src={authUser?.profilePic}
                alt="User Avatar"
                className="h-5 w-5 sm:h-6 sm:w-6 rounded-full object-cover"
              />
            </button>

            {/* Logout button */}
            <button className="btn btn-ghost btn-circle btn-sm sm:btn-md" onClick={logoutMutation}>
              <LogOutIcon className="h-4 w-4 sm:h-6 sm:w-6 text-base-content opacity-70" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
export default Navbar;
