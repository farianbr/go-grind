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
  LogOut,
  UserX,
  SwitchCamera,
  Fullscreen,
  Minimize,
} from "lucide-react";
import toast from "react-hot-toast";
import SessionSidebar, { SidebarToggleButton } from "./SessionSidebar";
import ParticipantActions from "./ParticipantActions";

const pad = (n) => String(n).padStart(2, "0");

function deskClock(startedAt, now) {
  if (!startedAt) return null;
  const secs = Math.max(0, Math.floor((now - new Date(startedAt)) / 1000));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(secs % 60)}` : `${pad(m)}:${pad(secs % 60)}`;
}

/**
 * The room floor.
 *
 * Deliberately not laid out as a video call. In a co-working room the camera is
 * usually off, so a grid of black rectangles is the common case, not the
 * exception. Every person is a desk instead: a nameplate carrying who they are,
 * what they are working on and how long they have been at it, with video
 * filling the desk only when they have chosen to turn it on.
 */
const CallContent = ({
  room,
  authUser,
  isCreator,
  removeUser,
  onLeaveStream,
  roomId,
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
  // Your own clock and task list are the co-working half of the room, so on a
  // desktop they open with it. On a phone the floor needs the whole screen.
  const [sidebarVisible, setSidebarVisible] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 1024
  );
  const [isMobile, setIsMobile] = useState(false);
  const [isVideoCover, setIsVideoCover] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

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

  const toggleMicrophone = async () => {
    if (isTogglingMic) return;
    setIsTogglingMic(true);
    try {
      if (isMicMuted) {
        await microphone.enable();
        localStorage.setItem(
          `stream_${authUser._id}_${room._id}_audio`,
          "active"
        );
      } else {
        await microphone.disable();
        localStorage.setItem(
          `stream_${authUser._id}_${room._id}_audio`,
          "inactive"
        );
      }
    } catch {
      toast.error("Failed to toggle microphone");
    } finally {
      setIsTogglingMic(false);
    }
  };

  const toggleCamera = async () => {
    if (isTogglingCam) return;
    setIsTogglingCam(true);
    try {
      if (isCamMuted) {
        await camera.enable();
        localStorage.setItem(
          `stream_${authUser._id}_${room._id}_video`,
          "active"
        );
      } else {
        await camera.disable();
        localStorage.setItem(
          `stream_${authUser._id}_${room._id}_video`,
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

  const flipCamera = async () => {
    if (isFlippingCam || isCamMuted) return;
    setIsFlippingCam(true);
    try {
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

  if (callingState === CallingState.LEFT) {
    return null;
  }

  if (callingState === CallingState.JOINING) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg"></span>
          <p className="mt-4 text-sm text-base-content/70">Taking your desk</p>
        </div>
      </div>
    );
  }

  if (callingState === CallingState.RECONNECTING) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="alert alert-warning max-w-md">
          <span className="loading loading-spinner"></span>
          <span>Reconnecting to the room</span>
        </div>
      </div>
    );
  }

  if (callingState !== CallingState.JOINED) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  const deskFor = (participantUserId) =>
    room?.activeStreams?.find(
      (s) => s.user?._id === participantUserId || s.user === participantUserId
    );

  const camerasOn = participants.filter((p) => hasVideo(p)).length;
  const alone = participants.length === 1;

  return (
    <>
      {/* On a phone the desk panel is a full-screen sheet, so the floor steps
          out of the row entirely. Left in place it collapsed to a few pixels
          and bled through the edge of the panel. */}
      <div
        className={`flex-1 min-w-0 flex-col bg-base-200 ${
          sidebarVisible ? "hidden md:flex" : "flex"
        }`}
      >
        <StreamTheme className="flex-1 min-h-0 flex flex-col">
          {/* ---- the room, not a call ---- */}
          <header className="shrink-0 border-b border-base-300 bg-base-100">
            <div className="px-3 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-semibold truncate">
                  {room?.name}
                </h1>
                <p className="text-xs text-base-content/55 inline-flex items-center gap-1.5">
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-success" />
                  </span>
                  {participants.length}{" "}
                  {participants.length === 1 ? "desk taken" : "desks taken"}
                  {camerasOn > 0 && (
                    <span className="hidden sm:inline text-base-content/40">
                      · {camerasOn} on camera
                    </span>
                  )}
                </p>
              </div>

              {!sidebarVisible && (
                <SidebarToggleButton onClick={() => setSidebarVisible(true)} />
              )}
            </div>
          </header>

          {/* ---- the floor ---- */}
          <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-5 py-3 sm:py-4">
            <div className="w-full max-w-6xl mx-auto">
              {alone && (
                <p className="text-sm text-base-content/60 mb-3">
                  You have the room to yourself. Your desk shows to every member
                  and they can pull up a chair whenever they want.
                </p>
              )}

              {/* auto-fill, not fixed breakpoints: the desk panel takes 384px
                  out of this column, so viewport breakpoints put two tiles in a
                  space that only fits one and every nameplate truncates. */}
              <ul
                className={`grid gap-3 sm:gap-4 content-start ${
                  alone
                    ? "grid-cols-1 max-w-2xl"
                    : "grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))]"
                }`}
              >
                {participants.map((participant) => {
                  const desk = deskFor(participant.userId);
                  const isMe = participant.userId === authUser?._id;
                  const hasVideoOn = hasVideo(participant);
                  const hasAudioOn = hasAudio(participant);
                  const clock = deskClock(desk?.startedAt, now);

                  return (
                    <li
                      key={participant.sessionId}
                      className="group rounded-box border border-base-300 bg-base-100 overflow-hidden flex flex-col"
                    >
                      {/* the desk itself: video when it's on, the person when
                          it isn't, rather than an empty black rectangle */}
                      <div className="relative aspect-video bg-base-200">
                        {hasVideoOn ? (
                          <div className="absolute inset-0">
                            <ParticipantView
                              participant={participant}
                              ParticipantViewUI={null}
                              mirror={true}
                            />
                          </div>
                        ) : (
                          <div className="absolute inset-0 grid place-items-center">
                            <img
                              src={participant.image || "/blank-pp.png"}
                              alt=""
                              className={`rounded-full object-cover ring-2 ring-base-300 ${
                                alone ? "size-24 sm:size-28" : "size-16 sm:size-20"
                              }`}
                            />
                          </div>
                        )}

                        <div className="absolute top-2 right-2 flex items-center gap-1.5">
                          {!hasAudioOn && (
                            <span
                              className="grid place-items-center size-6 rounded-full bg-base-100/85 backdrop-blur-xs text-base-content/60"
                              title="Muted"
                            >
                              <MicOff className="size-3.5" />
                            </span>
                          )}
                          {isCreator && !isMe && (
                            <button
                              onClick={() =>
                                removeUser(participant.userId, participant.name)
                              }
                              className="btn btn-error btn-xs gap-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                              title="Remove from this room"
                            >
                              <UserX className="size-3.5" />
                              <span className="hidden sm:inline">Remove</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* the nameplate: a real strip, not floating chrome.
                          Two rows so the name and the topic each get the tile's
                          full width instead of splitting it with the clock. */}
                      <div className="border-t border-base-300 px-3 py-2.5">
                        <div className="flex items-baseline gap-2">
                          <p className="text-sm font-medium truncate min-w-0 flex-1">
                            <Link
                              to={`/profile/${participant.userId}`}
                              className="hover:text-primary transition-colors"
                            >
                              {participant.name || "Anonymous"}
                            </Link>
                            {isMe && (
                              <span className="text-base-content/45 font-normal">
                                {" "}
                                (you)
                              </span>
                            )}
                          </p>
                          {clock && (
                            <span
                              className="text-xs font-mono tabular-nums text-base-content/50 shrink-0"
                              title="At this desk for"
                            >
                              {clock}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-base-content/60 truncate min-w-0 flex-1">
                            {desk?.workTopic || "Working"}
                          </p>
                          <span className="shrink-0 -mr-1">
                            <ParticipantActions
                              participantUserId={participant.userId}
                              participantName={participant.name}
                              roomId={roomId}
                              authUserId={authUser._id}
                            />
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* ---- your own controls, docked ---- */}
          <footer className="shrink-0 border-t border-base-300 bg-base-100">
            <div className="px-3 sm:px-5 py-2.5 flex items-center justify-between gap-3">
              <p className="text-xs text-base-content/50 hidden sm:block truncate">
                {isCamMuted && isMicMuted
                  ? "Camera and mic are off. Nobody can see or hear you."
                  : isCamMuted
                  ? "Camera off, mic live."
                  : "Camera on."}
              </p>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => setIsVideoCover(!isVideoCover)}
                  className="btn btn-circle btn-sm btn-ghost"
                  title={isVideoCover ? "Fit video to the desk" : "Fill the desk"}
                >
                  {isVideoCover ? (
                    <Minimize className="size-4" />
                  ) : (
                    <Fullscreen className="size-4" />
                  )}
                </button>

                {isMobile && !isCamMuted && (
                  <button
                    onClick={flipCamera}
                    className="btn btn-circle btn-sm btn-ghost"
                    title="Flip camera"
                    disabled={isFlippingCam}
                  >
                    {isFlippingCam ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      <SwitchCamera className="size-4" />
                    )}
                  </button>
                )}

                <button
                  onClick={toggleCamera}
                  className={`btn btn-circle btn-sm ${
                    isCamMuted ? "btn-neutral" : "btn-ghost"
                  }`}
                  title={isCamMuted ? "Turn on camera" : "Turn off camera"}
                  disabled={isTogglingCam}
                >
                  {isTogglingCam ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : isCamMuted ? (
                    <VideoOff className="size-4" />
                  ) : (
                    <Video className="size-4" />
                  )}
                </button>

                <button
                  onClick={toggleMicrophone}
                  className={`btn btn-circle btn-sm ${
                    isMicMuted ? "btn-neutral" : "btn-ghost"
                  }`}
                  title={isMicMuted ? "Unmute" : "Mute"}
                  disabled={isTogglingMic}
                >
                  {isTogglingMic ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : isMicMuted ? (
                    <MicOff className="size-4" />
                  ) : (
                    <Mic className="size-4" />
                  )}
                </button>

                <button
                  className="btn btn-error btn-sm gap-2"
                  onClick={handleLeave}
                  disabled={isLeaving}
                >
                  {isLeaving ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <LogOut className="size-4" />
                  )}
                  {isLeaving ? "Leaving..." : "Leave desk"}
                </button>
              </div>
            </div>
          </footer>
        </StreamTheme>
      </div>

      <SessionSidebar
        roomId={roomId}
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
