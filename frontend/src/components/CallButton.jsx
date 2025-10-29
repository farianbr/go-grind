import { VideoIcon } from "lucide-react";

function CallButton({ handleVideoCall }) {
  return (
    <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20">
      <button 
        onClick={handleVideoCall} 
        className="btn btn-success btn-sm sm:btn-md text-white shadow-lg hover:shadow-xl transition-shadow"
      >
        <VideoIcon className="size-4 sm:size-5" />
        <span className="hidden sm:inline ml-2">Video Call</span>
      </button>
    </div>
  );
}

export default CallButton;
