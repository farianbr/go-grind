import { useQuery } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router";
import { Video } from "lucide-react";
import useAuthUser from "../hooks/useAuthUser";
import { getMyRooms } from "../lib/api";

const ActiveStreamBanner = () => {
  const { authUser } = useAuthUser();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: myRooms } = useQuery({
    queryKey: ["myRooms"],
    queryFn: getMyRooms,
    enabled: !!authUser,
    refetchInterval: 10000,
  });

  const activeStreamRoom = myRooms?.find((room) =>
    room.activeStreams?.some(
      (stream) =>
        stream.user?._id === authUser?._id || stream.user === authUser?._id
    )
  );

  if (!activeStreamRoom || location.pathname.includes("/stream")) {
    return null;
  }

  return (
    activeStreamRoom && (
      <div className="fixed bottom-2 sm:bottom-4 right-2 sm:right-4 z-50 animate-in slide-in-from-bottom-5 duration-300">
        <div className="group relative">
          <button
            onClick={() => navigate(`/rooms/${activeStreamRoom._id}/stream`)}
            className="bg-primary text-primary-content rounded-full p-3 sm:p-3 shadow-2xl flex items-center justify-center hover:scale-105 transition-all duration-200"
            aria-label="Back to your desk"
          >
            <div className="relative">
              <Video className="size-5 sm:size-7" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 sm:h-3 sm:w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-error"></span>
              </span>
            </div>
          </button>

          <div className="pointer-events-none opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-200 absolute right-0 bottom-12 sm:bottom-14 z-50">
            <div className="bg-primary text-primary-content shadow-2xl rounded-lg p-3 sm:p-4 flex items-center gap-3 max-w-[300px]">
              <div className="shrink-0">
                <Video className="size-6 sm:size-8" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">
                  You&apos;re at a desk
                </p>
                <p className="text-xs opacity-90 truncate">
                  {activeStreamRoom.name}
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
