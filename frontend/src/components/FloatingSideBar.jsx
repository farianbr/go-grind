import { Menu } from "lucide-react";
import NavLinks from "./NavLinks";

const FloatingSideBar = () => {
  return (
    <div className="dropdown dropdown-end ml-auto lg:hidden">
      {/* DROPDOWN TRIGGER */}
      <button tabIndex={0} className="btn btn-ghost btn-circle">
        <Menu className="size-6" />
      </button>

      <div
        tabIndex={0}
        className="dropdown-content mt-2 p-1 shadow-2xl bg-base-200 backdrop-blur-lg rounded-2xl
        w-56 border border-base-content/10 max-h-80 overflow-y-auto"
      >
        <div className="space-y-1">
          <NavLinks />
        </div>
      </div>
    </div>
  );
};
export default FloatingSideBar;
