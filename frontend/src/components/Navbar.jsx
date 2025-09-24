import { Link, useNavigate } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { BellIcon, LogOutIcon, Airplay } from "lucide-react";
import useLogout from "../hooks/useLogout";
import ThemeSelector from "./ThemeSelector";
import FloatingSideBar from "./FloatingSideBar";

const Navbar = () => {
  const { authUser } = useAuthUser();
  const navigate = useNavigate();

  const { logoutMutation } = useLogout();

  return (
    <nav className="bg-base-200 border-b border-base-300 sticky top-0 z-30 h-16 flex items-center">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-end w-full">
          <div className="pl-5 lg:hidden">
            <Link to="/" className="flex items-center gap-2.5">
              <Airplay className="size-9 text-primary" />
              <span className="text-3xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary  tracking-wider">
                GoGrind
              </span>
            </Link>
          </div>
          <FloatingSideBar />

          <div className="flex items-center gap-3 sm:gap-4 lg:ml-auto">
            <Link to={"/notifications"}>
              <button className="btn btn-ghost btn-circle">
                <BellIcon className="h-6 w-6 text-base-content opacity-70" />
              </button>
            </Link>
          </div>

          <ThemeSelector />

          <button
            className="btn btn-ghost btn-circle"
            onClick={() => navigate("/update-profile")}
          >
            <img
              src={authUser?.profilePic}
              alt="User Avatar"
              className="h-6 w-6 rounded-full object-cover"
            />
          </button>

          {/* Logout button */}
          <button className="btn btn-ghost btn-circle" onClick={logoutMutation}>
            <LogOutIcon className="h-6 w-6 text-base-content opacity-70" />
          </button>
        </div>
      </div>
    </nav>
  );
};
export default Navbar;
