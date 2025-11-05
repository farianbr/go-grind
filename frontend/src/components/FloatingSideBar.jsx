import { Menu } from "lucide-react";
import NavLinks from "./NavLinks";
import { useState, useRef, useEffect } from "react";

const FloatingSideBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative ml-auto lg:hidden" ref={dropdownRef}>
      {/* DROPDOWN TRIGGER */}
      <button
        className="btn btn-circle bg-base-100 hover:bg-base-300 border-0 w-8 h-8 min-h-8 sm:w-10 sm:h-10 sm:min-h-10"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      {isOpen && (
        <div
          className="absolute -right-24 mt-2 p-1 shadow-2xl bg-base-100 rounded-2xl
        w-56 border border-base-300 max-h-80 overflow-y-auto z-50"
          onClick={() => setIsOpen(false)}
        >
          <div className="space-y-1">
            <NavLinks />
          </div>
        </div>
      )}
    </div>
  );
};
export default FloatingSideBar;
