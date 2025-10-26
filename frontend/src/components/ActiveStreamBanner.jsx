import { useQuery } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router";
import { Video, X } from "lucide-react";
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
  const activeStreamSpace = mySpaces?.find(space =>
    space.activeStreams?.some(stream => stream.user?._id === authUser?._id || stream.user === authUser?._id)
  );


  // Don't show banner if:
  // 1. User is not in any stream
  // 2. User is already on the stream room page
  if (!activeStreamSpace || location.pathname.includes('/stream')) {
    return null;
  }

  const myStream = activeStreamSpace.activeStreams.find(
    stream => stream.user?._id === authUser._id || stream.user === authUser._id
  );

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-primary text-primary-content shadow-2xl rounded-lg p-4 flex items-center gap-4 max-w-sm">
        <div className="flex-shrink-0">
          <div className="relative">
            <Video className="size-8" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-error"></span>
            </span>
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Grinding in Progress</p>
          <p className="text-xs opacity-90 truncate">
            {activeStreamSpace.name}
          </p>
          {myStream?.grindingTopic && (
            <p className="text-xs opacity-75 truncate mt-1">
              Focusing on: {myStream.grindingTopic}
            </p>
          )}
        </div>

        <button
          onClick={() => navigate(`/spaces/${activeStreamSpace._id}/stream`)}
          className="btn btn-sm btn-ghost hover:bg-primary-focus"
        >
          Rejoin
        </button>
      </div>
    </div>
  );
};

export default ActiveStreamBanner;
