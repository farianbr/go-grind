import { useQuery } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router";
import { Video } from "lucide-react";
import useAuthUser from "../hooks/useAuthUser";
import { getMySpaces } from "../lib/api";

const ActiveStreamBanner = () => {
  const { authUser } = useAuthUser();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: mySpaces } = useQuery({
    queryKey: ["mySpaces"],
    queryFn: getMySpaces,
    enabled: !!authUser,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Find if user is in any active stream
  const activeStreamSpace = mySpaces?.find((space) =>
    space.activeStreams?.some(
      (stream) =>
        stream.user?._id === authUser?._id || stream.user === authUser?._id
    )
  );

  // Don't show banner if:
  // 1. User is not in any stream
  // 2. User is already on the stream room page
  if (!activeStreamSpace || location.pathname.includes("/stream")) {
    return null;
  }

  return (
    activeStreamSpace && (
      <div className="fixed bottom-2 sm:bottom-4 right-2 sm:right-4 z-50 animate-in slide-in-from-bottom-5 duration-300">
        {/* Compact icon visible by default; full banner revealed on hover (desktop) */}
        <div className="group relative">
          <button
            onClick={() => navigate(`/spaces/${activeStreamSpace._id}/stream`)}
            className="bg-primary text-primary-content rounded-full p-3 sm:p-3 shadow-2xl flex items-center justify-center hover:scale-105 transition-all duration-200"
            aria-label="Rejoin stream"
          >
            <div className="relative">
              <Video className="size-5 sm:size-7" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 sm:h-3 sm:w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-error"></span>
              </span>
            </div>
          </button>

          {/* Expanded panel - hidden by default, visible on hover */}
          <div className="pointer-events-none opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-200 absolute right-0 bottom-12 sm:bottom-14 z-50">
            <div className="bg-primary text-primary-content shadow-2xl rounded-lg p-3 sm:p-4 flex items-center gap-3 max-w-[300px]">
              <div className="shrink-0">
                <Video className="size-6 sm:size-8" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">
                  Grinding in Progress
                </p>
                <p className="text-xs opacity-90 truncate">
                  {activeStreamSpace.name}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  );
};

export default ActiveStreamBanner;
