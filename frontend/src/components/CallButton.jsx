import { VideoIcon } from "lucide-react";

function CallButton({ handleVideoCall }) {
  return (
    <div className="absolute top-3 sm:top-4 right-3 sm:right-4 z-20">
      <button 
        onClick={handleVideoCall} 
        className="btn btn-success btn-xs sm:btn-sm md:btn-md text-white shadow-lg hover:shadow-xl transition-all flex items-center gap-1 sm:gap-2"
      >
        <VideoIcon className="size-3 sm:size-4 md:size-5" />
        <span className="hidden sm:inline text-xs sm:text-sm md:text-base">Video Call</span>
      </button>
    </div>
  );
}

export default CallButton;
