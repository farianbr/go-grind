import { PaletteIcon } from "lucide-react";
import { useThemeStore } from "../store/useThemeStore";
import { THEMES } from "../constants";
import { useState, useRef, useEffect } from "react";

const ThemeSelector = () => {
  const { theme, setTheme } = useThemeStore();
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

  const handleThemeChange = (themeName) => {
    setTheme(themeName);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* DROPDOWN TRIGGER */}
      <button
        className="btn btn-circle bg-base-100 hover:bg-base-300 border-0 w-8 h-8 min-h-8 sm:w-10 sm:h-10 sm:min-h-10"
        onClick={() => setIsOpen(!isOpen)}
      >
        <PaletteIcon className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 p-1 shadow-2xl bg-base-100 rounded-2xl
        w-56 border border-base-300 max-h-80 overflow-y-auto z-50"
        >
          <div className="space-y-1">
            {THEMES.map((themeOption) => (
              <button
                key={themeOption.name}
                className={`
              w-full px-4 py-3 rounded-xl flex items-center gap-3 transition-colors
              ${
                theme === themeOption.name
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-base-content/5"
              }
            `}
                onClick={() => handleThemeChange(themeOption.name)}
              >
                <PaletteIcon className="size-4" />
                <span className="text-sm font-medium">{themeOption.label}</span>
                {/* THEME PREVIEW COLORS */}
                <div className="ml-auto flex gap-1">
                  {themeOption.colors.map((color, i) => (
                    <span
                      key={i}
                      className="size-2 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default ThemeSelector;
