import useAuthUser from "../hooks/useAuthUser";
import NavLinks from "./NavLinks";
import { Link } from "react-router";

const Sidebar = () => {
  const { authUser } = useAuthUser();

  return (
    <aside className="w-56 lg:w-64 xl:w-72 bg-base-200 border-r border-base-300 hidden lg:flex flex-col h-[calc(100vh-4rem)] sticky top-16">
      <nav className="flex-1 p-3 lg:p-4 space-y-1">
        <NavLinks/>
      </nav>

      {/* USER PROFILE SECTION */}
      <Link 
        to={`/profile/${authUser?._id}`} 
        className="p-3 lg:p-4 border-t border-base-300 mt-auto hover:bg-base-300/50 transition-colors"
      >
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="avatar">
            <div className="w-8 lg:w-10 rounded-full">
              <img src={authUser?.profilePic} alt="User Avatar" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs lg:text-sm truncate">{authUser?.fullName}</p>
            <p className="text-[10px] lg:text-xs text-base-content/60">
              View Profile
            </p>
          </div>
        </div>
      </Link>
    </aside>
  );
};
export default Sidebar;
