import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  CallingState,
  useCallStateHooks,
  ParticipantView,
  hasAudio,
  hasVideo,
  StreamTheme,
} from "@stream-io/video-react-sdk";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Users,
  LogOut,
  UserX,
  SwitchCamera,
  Fullscreen,
  Minimize,
} from "lucide-react";
import toast from "react-hot-toast";
import SessionSidebar, { SidebarToggleButton } from "./SessionSidebar";
import ParticipantActions from "./ParticipantActions";

const CallContent = ({
  space,
  authUser,
  isCreator,
  removeUser,
  onLeaveStream,
  spaceId,
}) => {
  const {
    useCallCallingState,
    useParticipants,
    useMicrophoneState,
    useCameraState,
  } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participants = useParticipants();
  const { microphone, isMute: isMicMuted } = useMicrophoneState();
  const { camera, isMute: isCamMuted } = useCameraState();
  const [isTogglingMic, setIsTogglingMic] = useState(false);
  const [isTogglingCam, setIsTogglingCam] = useState(false);
  const [isFlippingCam, setIsFlippingCam] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isVideoCover, setIsVideoCover] = useState(false);

  // Add style to ensure video elements cover container properly
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .str-video__participant-view video {
        object-fit: ${isVideoCover ? "cover" : "contain"} !important;
        width: 100% !important;
        height: 100% !important;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, [isVideoCover]);

  // Detect if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        window.innerWidth <= 768 ||
          /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
      );
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Toggle microphone with proper error handling
  const toggleMicrophone = async () => {
    if (isTogglingMic) return;
    setIsTogglingMic(true);
    try {
      if (isMicMuted) {
        await microphone.enable();
        localStorage.setItem(
          `stream_${authUser._id}_${space._id}_audio`,
          "active"
        );
      } else {
        await microphone.disable();
        localStorage.setItem(
          `stream_${authUser._id}_${space._id}_audio`,
          "inactive"
        );
      }
    } catch {
      toast.error("Failed to toggle microphone");
    } finally {
      setIsTogglingMic(false);
    }
  };

  // Toggle camera with proper error handling
  const toggleCamera = async () => {
    if (isTogglingCam) return;
    setIsTogglingCam(true);
    try {
      if (isCamMuted) {
        await camera.enable();
        localStorage.setItem(
          `stream_${authUser._id}_${space._id}_video`,
          "active"
        );
      } else {
        await camera.disable();
        localStorage.setItem(
          `stream_${authUser._id}_${space._id}_video`,
          "inactive"
        );
      }
    } catch (error) {
      console.error("Error toggling camera:", error);
      toast.error("Failed to toggle camera");
    } finally {
      setIsTogglingCam(false);
    }
  };

  // Flip camera (switch between front and back on mobile devices)
  const flipCamera = async () => {
    if (isFlippingCam || isCamMuted) return;
    setIsFlippingCam(true);
    try {
      // Use Stream's flip method
      await camera.flip();
      toast.success("Camera flipped");
    } catch (error) {
      console.error("Error flipping camera:", error);
      toast.error("Failed to flip camera");
    } finally {
      setIsFlippingCam(false);
    }
  };

  const handleLeave = async () => {
    setIsLeaving(true);
    await onLeaveStream();
  };

  // Handle calling state - show appropriate UI
  if (callingState === CallingState.LEFT) {
    return null;
  }

  if (callingState === CallingState.JOINING) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg"></span>
          <p className="mt-4">Joining call...</p>
        </div>
      </div>
    );
  }

  if (callingState === CallingState.RECONNECTING) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="alert alert-warning max-w-md">
          <span className="loading loading-spinner"></span>
          <span>Reconnecting to the call...</span>
        </div>
      </div>
    );
  }

  // Get grinding info for each participant from space.activeStreams
  const getGrindingInfo = (participantUserId) => {
    const stream = space?.activeStreams?.find(
      (s) => s.user?._id === participantUserId || s.user === participantUserId
    );
    return stream?.grindingTopic || "";
  };

  // Only render UI when in JOINED state
  if (callingState !== CallingState.JOINED) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg"></span>
          <p className="mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Video Call Area - Takes remaining space */}
      <div className="flex-1 overflow-auto bg-base-300 relative">
        <StreamTheme className="h-full w-full flex flex-col">
          {/* Header with Controls - Modern Sleek Design */}
          <div className="bg-linear-to-r from-base-100 via-base-200 to-base-100 border-b border-base-300 shrink-0">
            <div className="max-w-full mx-auto px-3 sm:px-6 py-3 sm:py-4">
              <div className="flex items-center justify-between gap-3 sm:gap-6">
                {/* Left Section - Space Info & Stats */}
                <div className="flex items-center gap-3 sm:gap-6 flex-1 min-w-0">
                  {/* Space Name */}
                  <div className="shrink min-w-0">
                    <h1 className="text-lg sm:text-xl lg:text-2xl font-bold truncate">
                      {space?.name}
                    </h1>
                  </div>

                  {/* Divider - Only show on larger screens */}
                  <div className="hidden xl:block h-10 w-px bg-base-300"></div>

                  {/* Stats Pills - Only show on xl and above */}
                  <div className="hidden xl:flex items-center gap-3">
                    {/* Participant Count */}
                    <div className="flex items-center gap-2 bg-base-300/50 px-3 py-1.5 rounded-full border border-base-300">
                      <Users size={16} className="text-primary" />
                      <span className="text-sm font-medium">
                        {participants.length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Center Section - Media Controls */}
                <div className="flex items-center gap-2">
                  {/* Video cover toggle */}

                  <button
                    onClick={() => setIsVideoCover(!isVideoCover)}
                    className="btn btn-circle btn-sm sm:btn-md btn-ghost hover:bg-base-300 transition-all duration-200"
                    title={isVideoCover ? "Fit to screen" : "Cover screen"}
                  >
                    {isVideoCover ? (
                      <Minimize size={18} className="sm:size-4" />
                    ) : (
                      <Fullscreen size={18} className="sm:size-4" />
                    )}
                  </button>

                  {/* Camera Flip Button - Only show on mobile when camera is on */}
                  {isMobile && !isCamMuted && (
                    <button
                      onClick={flipCamera}
                      className="btn btn-circle btn-sm sm:btn-md btn-ghost hover:bg-base-300 transition-all duration-200"
                      title="Flip camera"
                      disabled={isFlippingCam}
                    >
                      {isFlippingCam ? (
                        <span className="loading loading-spinner loading-sm"></span>
                      ) : (
                        <SwitchCamera size={18} />
                      )}
                    </button>
                  )}
                  {/* Camera Toggle */}
                  <button
                    onClick={toggleCamera}
                    className={`btn btn-circle btn-sm sm:btn-md transition-all duration-200 ${
                      isCamMuted
                        ? "btn-error hover:btn-error "
                        : "btn-ghost hover:bg-base-300"
                    }`}
                    title={isCamMuted ? "Turn on camera" : "Turn off camera"}
                    disabled={isTogglingCam}
                  >
                    {isTogglingCam ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : isCamMuted ? (
                      <VideoOff size={18} />
                    ) : (
                      <Video size={18} />
                    )}
                  </button>

                  {/* Microphone Toggle */}
                  <button
                    onClick={toggleMicrophone}
                    className={`btn btn-circle btn-sm sm:btn-md transition-all duration-200 ${
                      isMicMuted
                        ? "btn-error hover:btn-error"
                        : "btn-ghost hover:bg-base-300"
                    }`}
                    title={isMicMuted ? "Unmute" : "Mute"}
                    disabled={isTogglingMic}
                  >
                    {isTogglingMic ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : isMicMuted ? (
                      <MicOff size={18} />
                    ) : (
                      <Mic size={18} />
                    )}
                  </button>

                  {/* Leave Button */}
                  <button
                    className="btn btn-error btn-circle btn-sm sm:btn-md sm:w-30 transition-all duration-200 hover:shadow-error/50"
                    onClick={handleLeave}
                    disabled={isLeaving}
                    title="Leave stream"
                  >
                    {isLeaving ? (
                      <>
                        <span className="loading loading-spinner loading-xs sm:loading-sm"></span>
                        <span className="hidden sm:inline text-sm ml-1.5">
                          Leaving...
                        </span>
                      </>
                    ) : (
                      <>
                        <LogOut size={18} className="sm:mr-1.5" />
                        <span className="hidden sm:inline text-sm font-medium">
                          Leave
                        </span>
                      </>
                    )}
                  </button>

                  {/* Sidebar Toggle - Only show when sidebar is hidden */}
                  {!sidebarVisible && (
                    <SidebarToggleButton
                      onClick={() => setSidebarVisible(true)}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Responsive Grid Layout for participants - aligned to top */}
          <div className="flex-1 overflow-auto bg-base-300 p-2 sm:p-4">
            <div className="w-full max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4 content-start">
              {participants.map((participant) => {
                const grindingTopic = getGrindingInfo(participant.userId);
                const isMe = participant.userId === authUser?._id;
                const hasVideoOn = hasVideo(participant);
                const hasAudioOn = hasAudio(participant);

                return (
                  <div
                    key={participant.sessionId}
                    className="relative bg-base-300 rounded-lg overflow-hidden shadow-xl group"
                    style={{
                      aspectRatio: "16/9",
                      maxHeight: participants.length === 1 ? "600px" : "350px",
                      width: "100%",
                    }}
                  >
                    <div className="absolute inset-0">
                      <ParticipantView
                        participant={participant}
                        ParticipantViewUI={null}
                        mirror={true}
                      />
                    </div>

                    {/* Top overlay - Name and grinding topic */}
                    <div className="absolute top-1 sm:top-2 left-1 sm:left-2 right-1 sm:right-2 flex items-start justify-between gap-1 sm:gap-2">
                      <div className="flex justify-between bg-base-100/70 backdrop-blur-sm px-2 sm:px-3 py-1 sm:py-2 rounded-md sm:rounded-lg shadow-lg flex-1 min-w-0">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs sm:text-sm font-bold truncate block">
                            <Link
                              to={`/profile/${participant.userId}`}
                              className="hover:underline"
                            >
                              {participant.name || "Anonymous"}
                            </Link>
                            {isMe && (
                              <span className="text-primary ml-1">(You)</span>
                            )}
                          </div>
                          {grindingTopic && (
                            <p className="text-[10px] sm:text-xs text-base-content/70 truncate mt-0.5 sm:mt-1">
                              Focusing on: {grindingTopic}
                            </p>
                          )}
                        </div>

                        {/* Remove button for creator - only show on hover */}
                        {isCreator && !isMe && (
                          <button
                            onClick={() =>
                              removeUser(participant.userId, participant.name)
                            }
                            className="btn btn-error btn-xs my-auto sm:btn-sm gap-1 sm:gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg shrink-0"
                            title="Remove from stream"
                          >
                            <UserX size={14} className="sm:size-4" />
                            <span className="hidden sm:inline text-xs">
                              Remove
                            </span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Bottom overlay - Media status indicators + Task Status + Encourage */}
                    <div className="absolute bottom-1 sm:bottom-2 left-1 sm:left-2 right-1 sm:right-2 flex items-center justify-between gap-1 sm:gap-2">
                      {/* Left side - Media status */}
                      <div className="flex items-center gap-1 sm:gap-2">
                        {hasVideoOn ? (
                          <div className="bg-base-100/90 backdrop-blur-xs p-1 sm:p-1.5 rounded-full shadow-lg">
                            <Video size={14} className="sm:size-4" />
                          </div>
                        ) : (
                          <div className="bg-base-100/90 backdrop-blur-xs p-1 sm:p-1.5 rounded-full shadow-lg">
                            <VideoOff
                              size={14}
                              className="sm:size-4 text-error"
                            />
                          </div>
                        )}
                        {hasAudioOn ? (
                          <div className="bg-base-100/90 backdrop-blur-xs p-1 sm:p-1.5 rounded-full shadow-lg">
                            <Mic size={14} className="sm:size-4" />
                          </div>
                        ) : (
                          <div className="bg-base-100/90 backdrop-blur-xs p-1 sm:p-1.5 rounded-full shadow-lg">
                            <MicOff
                              size={14}
                              className="sm:size-4 text-error"
                            />
                          </div>
                        )}
                      </div>

                      {/* Right side - Task Status + Encourage - Show for all participants */}
                      <ParticipantActions
                        participantUserId={participant.userId}
                        participantName={participant.name}
                        spaceId={spaceId}
                        authUserId={authUser._id}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </StreamTheme>
      </div>

      {/* Session Sidebar - Beside the stream window */}
      <SessionSidebar
        spaceId={spaceId}
        authUser={authUser}
        defaultVisible={false}
        participantCount={participants.length}
        externalVisible={sidebarVisible}
        onToggleVisibility={setSidebarVisible}
      />
    </>
  );
};

export default CallContent;
