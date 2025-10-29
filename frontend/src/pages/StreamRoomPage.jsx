import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getSpaceById,
  getStreamToken,
  joinStream,
  leaveStream,
  removeFromStream,
} from "../lib/api";

import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  StreamTheme,
  CallingState,
  useCallStateHooks,
  ParticipantView,
  hasAudio,
  hasVideo,
} from "@stream-io/video-react-sdk";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import toast from "react-hot-toast";
import PageLoader from "../components/PageLoader";
import SessionSidebar from "../components/SessionSidebar";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Users,
  LogOut,
  UserX,
} from "lucide-react";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const StreamRoomPage = () => {
  const { id: spaceId } = useParams();
  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(true);
  const [grindingTopic, setGrindingTopic] = useState("");
  const [targetDuration, setTargetDuration] = useState(60);
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showKickModal, setShowKickModal] = useState(false);
  const [kickTargetUser, setKickTargetUser] = useState(null);
  const [kickReason, setKickReason] = useState("");
  const wasKickedRef = useRef(false); // Track if user was kicked to prevent duplicate leave calls
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { authUser, isLoading: authLoading } = useAuthUser();

  // Fetch space data and refresh every 10 seconds
  const { data: space, isLoading: spaceLoading } = useQuery({
    queryKey: ["space", spaceId],
    queryFn: () => getSpaceById(spaceId),
    enabled: !!spaceId,
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser,
  });

  // Join stream mutation
  const { mutate: joinStreamMutation, isPending: isJoining } = useMutation({
    mutationFn: ({ spaceId, grindingTopic, targetDuration, tasks, isVideoEnabled, isAudioEnabled }) =>
      joinStream(spaceId, { grindingTopic, targetDuration, tasks, isVideoEnabled, isAudioEnabled }),
    onSuccess: () => {
      const storageKey = `stream_${authUser._id}_${spaceId}_active`;
      localStorage.setItem(storageKey, "active");
      localStorage.setItem(
        `stream_${authUser._id}_${spaceId}_audio`,
        audioEnabled ? "active" : "inactive"
      );
      localStorage.setItem(
        `stream_${authUser._id}_${spaceId}_video`,
        videoEnabled ? "active" : "inactive"
      );
      queryClient.invalidateQueries({ queryKey: ["space", spaceId] });
      setShowJoinModal(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to join stream");
    },
  });

  // Remove from stream mutation (admin only)
  const { mutate: removeUserMutation, isPending: isRemoving } = useMutation({
    mutationFn: ({ spaceId, userId, reason }) =>
      removeFromStream(spaceId, userId, reason),
    onSuccess: (data) => {
      toast.success("User removed from stream");
      queryClient.setQueryData(["space", spaceId], data);
      queryClient.invalidateQueries({ queryKey: ["space", spaceId] });
      queryClient.invalidateQueries({ queryKey: ["stream", spaceId] });

      setShowKickModal(false);
      setKickTargetUser(null);
      setKickReason("");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to remove user");
    },
  });

  // Check if user is already in stream
  const isUserInStream = space?.activeStreams?.some(
    (stream) =>
      stream.user?._id === authUser?._id || stream.user === authUser?._id
  );

  // Check if user is creator
  const isCreator = space?.creator._id === authUser?._id;

  // Check localStorage for active stream state and manage join modal
  useEffect(() => {
    if (authUser && spaceId) {
      const storageKey = `stream_${authUser._id}_${spaceId}_active`;
      const storedState = localStorage.getItem(storageKey);

      if (storedState === "active" && isUserInStream) {
        setShowJoinModal(false);
      } else if (isUserInStream) {
        setShowJoinModal(false);
      }
    }
  }, [authUser, spaceId, isUserInStream]);

  // Initialize StreamVideoClient - following best practices
  useEffect(() => {
    if (!tokenData?.token || !authUser || showJoinModal) {
      return;
    }

    const user = {
      id: authUser._id,
      name: authUser.fullName,
      image: authUser.profilePic,
    };

    // Use getOrCreateInstance to ensure only one client instance
    const videoClient = StreamVideoClient.getOrCreateInstance({
      apiKey: STREAM_API_KEY,
      user,
      token: tokenData.token,
    });

    setClient(videoClient);

    // Cleanup function - disconnect user when component unmounts
    return () => {
      videoClient
        .disconnectUser()
        .catch((err) => console.error("Error disconnecting user:", err));
      setClient(null);
    };
  }, [tokenData, authUser, showJoinModal]);

  // Initialize and join call
  useEffect(() => {
    if (!client || !spaceId || !isUserInStream || showJoinModal) {
      return;
    }

    const callInstance = client.call("default", spaceId);
    const kickedRef = wasKickedRef; // Capture the ref itself for cleanup

    // Disable speaking while muted notification
    callInstance.microphone.disableSpeakingWhileMutedNotification();

    // Set initial media states based on user preferences
    const videoStorageKey = `stream_${authUser._id}_${spaceId}_video`;
    const audioStorageKey = `stream_${authUser._id}_${spaceId}_audio`;

    if (localStorage.getItem(videoStorageKey) === "inactive") {
      callInstance.camera.disable();
    }

    if (localStorage.getItem(audioStorageKey) === "inactive") {
      callInstance.microphone.disable();
    }

    // Join the call
    callInstance
      .join({ create: true })
      .then(() => {
        console.log("Successfully joined call");
        setCall(callInstance);
        toast.success("Joined the stream!");

        // Store active stream state in localStorage
        if (authUser) {
          const storageKey = `stream_${authUser._id}_${spaceId}_active`;
          localStorage.setItem(storageKey, "active");
        }
      })
      .catch((error) => {
        console.error("Error joining call:", error);
        toast.error("Could not join the video call. Please try again.");
        navigate(`/spaces/${spaceId}`);
      });

    // Cleanup function - leave call when component unmounts
    return () => {
      // Only leave if the call hasn't already been left and user wasn't kicked
      try {
        const callingState = callInstance?.state?.callingState;
        if (!kickedRef.current && callingState !== CallingState.LEFT) {
          callInstance.leave().catch((err) => {
            console.error("Error leaving call:", err);
          });
        }
      } catch {
        // Defensive: ignore any errors during cleanup
      }
      setCall(null);
    };
  }, [client, spaceId, isUserInStream, showJoinModal, authUser, navigate]);

  // Add task handler
  const handleAddTask = () => {
    if (!newTaskTitle.trim()) {
      toast.error("Please enter a task title");
      return;
    }
    setTasks([...tasks, { title: newTaskTitle.trim() }]);
    setNewTaskTitle("");
  };

  // Remove task handler
  const handleRemoveTask = (index) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  // Handle join stream
  const handleJoinStream = () => {
    if (!grindingTopic.trim()) {
      toast.error("Please enter what you're grinding");
      return;
    }

    if (!targetDuration || targetDuration < 5) {
      toast.error("Target duration must be at least 5 minutes");
      return;
    }

    // Check if user is already in another stream room
    const allActiveStreamKeys = Object.keys(localStorage).filter(
      (key) =>
        key.startsWith(`stream_${authUser._id}_`) &&
        key.endsWith("_active") &&
        localStorage.getItem(key) === "active"
    );

    if (allActiveStreamKeys.length > 0) {
      // Extract space ID from the key
      const existingStreamSpaceId = allActiveStreamKeys[0]
        .replace(`stream_${authUser._id}_`, "")
        .replace("_active", "");

      if (existingStreamSpaceId !== spaceId) {
        toast.error(
          "You are already in another stream room. Please leave that room first."
        );
        return;
      }
    }

    joinStreamMutation({
      spaceId,
      grindingTopic: grindingTopic.trim(),
      targetDuration,
      tasks,
      isVideoEnabled: videoEnabled,
      isAudioEnabled: audioEnabled,
    });
  };

  // Handle leave stream
  const handleLeaveStream = async () => {
    try {
      // Leave backend stream
      await leaveStream(spaceId);

      // Clear localStorage
      if (authUser) {
        localStorage.removeItem(`stream_${authUser._id}_${spaceId}_active`);
        localStorage.removeItem(`stream_${authUser._id}_${spaceId}_video`);
        localStorage.removeItem(`stream_${authUser._id}_${spaceId}_audio`);
      }

      queryClient.invalidateQueries({ queryKey: ["space", spaceId] });
      queryClient.invalidateQueries({ queryKey: ["mySpaces"] });
      toast.success("Left the stream");

      navigate(`/spaces/${spaceId}`);
    } catch (error) {
      console.error("Error leaving stream:", error);
      toast.error("Failed to leave stream");
    }
  };

  // Handle remove user - open modal
  const handleRemoveUser = (userId, userName) => {
    setKickTargetUser({ id: userId, name: userName });
    setShowKickModal(true);
  };

  // Confirm kick with reason
  const handleConfirmKick = async () => {
    if (!kickTargetUser) return;

    await call.kickUser({ user_id: kickTargetUser.id });
    removeUserMutation({
      spaceId,
      userId: kickTargetUser.id,
      reason: kickReason.trim() || "No reason provided",
    });
  };

  // Detect if current user was kicked from stream
  useEffect(() => {
    if (!authUser || !spaceId) return;

    const wasInStream =
      localStorage.getItem(`stream_${authUser._id}_${spaceId}_active`) ===
      "active";

    if (wasInStream && !isUserInStream && space) {
      // User was in stream but is no longer - they were kicked
      wasKickedRef.current = true; // Set flag to prevent duplicate leave call

      // Clear localStorage
      localStorage.removeItem(`stream_${authUser._id}_${spaceId}_active`);
      localStorage.removeItem(`stream_${authUser._id}_${spaceId}_video`);
      localStorage.removeItem(`stream_${authUser._id}_${spaceId}_audio`);

      // Show toast and navigate
      toast.error("You have been removed from the stream");
      navigate(`/spaces/${spaceId}`);
    }
  }, [isUserInStream, authUser, spaceId, space, navigate]);

  if (
    authLoading ||
    spaceLoading ||
    (!showJoinModal && !call) ||
    (wasKickedRef.current && !isUserInStream)
  ) {
    return <PageLoader />;
  }

  // Join Modal
  if (showJoinModal && !isUserInStream) {
    return (
      <div
        className="flex items-center justify-center bg-base-200"
        style={{ height: "calc(100vh - 64px)" }}
      >
        <div className="card w-full max-w-lg bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-2xl">Join Stream Room</h2>
            <p className="text-base-content/60">Space: {space?.name}</p>

            {/* Stream not initialized warning for non-creators */}
            {!isCreator && !space?.streamInitialized && (
              <div className="alert alert-warning mt-4">
                <div>
                  <p className="font-semibold">Stream Room Not Ready</p>
                  <p className="text-sm mt-1">
                    The creator needs to enter the stream room first to
                    initialize it.
                  </p>
                </div>
              </div>
            )}

            {/* Creator first-time message */}
            {isCreator && !space?.streamInitialized && (
              <div className="alert alert-info mt-4">
                <div>
                  <p className="font-semibold">Initialize Stream Room</p>
                  <p className="text-sm mt-1">
                    You're entering the stream room for the first time. This
                    will make it available for all members.
                  </p>
                </div>
              </div>
            )}

            <fieldset className="fieldset mt-4">
              <label className="label" htmlFor="grinding-topic">
                What are you grinding?
              </label>
              <input
                id="grinding-topic"
                type="text"
                placeholder="e.g., React components, Math problems, etc."
                className="input w-full"
                value={grindingTopic}
                onChange={(e) => setGrindingTopic(e.target.value)}
              />
            </fieldset>

            <fieldset className="fieldset mt-4">
              <label className="label" htmlFor="target-duration">
                Target Duration
              </label>
              
              {/* Quick Select Buttons */}
              <div className="flex flex-wrap gap-2 mb-2">
                {[5, 15, 30, 60, 120, 180].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    className={`btn btn-sm ${
                      targetDuration === mins ? "btn-primary" : "btn-outline"
                    }`}
                    onClick={() => setTargetDuration(mins)}
                  >
                    {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                  </button>
                ))}
              </div>

              {/* Custom Duration Input */}
              <input
                id="target-duration"
                type="number"
                placeholder="Or enter custom minutes"
                className="input w-full"
                value={targetDuration}
                onChange={(e) => setTargetDuration(parseInt(e.target.value) || 5)}
                min="5"
                step="5"
              />
              <label className="label" htmlFor="target-duration">
                <span className="text-xs opacity-70">Minimum 5 minutes</span>
              </label>
            </fieldset>

            <fieldset className="fieldset mt-4">
              <label className="label" htmlFor="session-task">
                Session Tasks (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  id="session-task"
                  type="text"
                  placeholder="Add a task for this session"
                  className="input flex-1"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyUp={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTask();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-primary rounded"
                  onClick={handleAddTask}
                >
                  Add
                </button>
              </div>
              
              {tasks.length > 0 && (
                <div className="mt-3 space-y-2 max-h-32 overflow-y-auto pr-2">
                  {tasks.map((task, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-base-200 rounded-lg"
                    >
                      <span className="flex-1 text-sm wrap-break-word">{task.title}</span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs btn-circle shrink-0"
                        onClick={() => handleRemoveTask(index)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </fieldset>

            <div className="flex gap-4 mt-4">
              <fieldset className="fieldset">
                <label className="label cursor-pointer gap-2">
                  {videoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
                  <span>Video</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={videoEnabled}
                    onChange={(e) => {
                      setVideoEnabled(e.target.checked);
                    }}
                  />
                </label>
              </fieldset>

              <fieldset className="fieldset">
                <label className="label cursor-pointer gap-2">
                  {audioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                  <span>Audio</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={audioEnabled}
                    onChange={(e) => {
                      setAudioEnabled(e.target.checked);
                    }}
                  />
                </label>
              </fieldset>
            </div>

            <div className="card-actions justify-end mt-6">
              <button
                className="btn btn-ghost"
                onClick={() => navigate(`/spaces/${spaceId}`)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleJoinStream}
                disabled={
                  isJoining || (!isCreator && !space?.streamInitialized)
                }
              >
                {isJoining ? (
                  <span className="loading loading-spinner"></span>
                ) : (
                  "Join Stream"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Kick User Modal - Simple fixed overlay */}
      {showKickModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-base-100 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="font-bold text-lg mb-4">Remove User from Stream</h3>
            <p className="mb-4">
              Are you sure you want to remove{" "}
              <span className="font-semibold">{kickTargetUser?.name}</span> from
              the stream?
            </p>

            <fieldset className="fieldset mb-4">
              <label className="label" htmlFor="kick-reason">
                Reason (optional)
              </label>
              <textarea
                id="kick-reason"
                className="textarea h-24 w-full"
                placeholder="e.g., Disruptive behavior, inappropriate content, etc."
                value={kickReason}
                onChange={(e) => setKickReason(e.target.value)}
              />
            </fieldset>

            <div className="flex justify-end gap-2">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setShowKickModal(false);
                  setKickTargetUser(null);
                  setKickReason("");
                }}
                disabled={isRemoving}
              >
                Cancel
              </button>
              <button
                className="btn btn-error"
                onClick={handleConfirmKick}
                disabled={isRemoving}
              >
                {isRemoving ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Removing...
                  </>
                ) : (
                  "Remove User"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className="flex bg-base-200"
        style={{ height: "calc(100vh - 64px)" }}
      >
        {/* Video Call Area - Takes remaining space */}
        <div className="flex-1 overflow-auto bg-base-300 relative">
          {client && call ? (
            <StreamVideo client={client}>
              <StreamCall call={call}>
                <CallContent
                  space={space}
                  authUser={authUser}
                  isCreator={isCreator}
                  removeUser={handleRemoveUser}
                  onLeaveStream={handleLeaveStream}
                />
              </StreamCall>
            </StreamVideo>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p>
                Could not initialize video call. Please refresh or try again
                later.
              </p>
            </div>
          )}
        </div>

        {/* Session Sidebar - Beside the stream window */}
        <SessionSidebar spaceId={spaceId} authUser={authUser} defaultVisible={false} />
      </div>
    </>
  );
};

const CallContent = ({
  space,
  authUser,
  isCreator,
  removeUser,
  onLeaveStream,
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
  const [isLeaving, setIsLeaving] = useState(false);

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
    } catch (error) {
      console.error("Error toggling microphone:", error);
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

  // Calculate grid layout based on participant count
  const getGridLayout = (count) => {
    if (count === 1) return { cols: 1, rows: 1 };
    if (count === 2) return { cols: 2, rows: 1 };
    if (count <= 4) return { cols: 2, rows: 2 };
    if (count <= 6) return { cols: 3, rows: 2 };
    if (count <= 9) return { cols: 3, rows: 3 };
    return { cols: 4, rows: Math.ceil(count / 4) };
  };

  const layout = getGridLayout(participants.length);

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

              {/* Divider */}
              <div className="hidden sm:block h-10 w-px bg-base-300"></div>

              {/* Stats Pills */}
              <div className="hidden md:flex items-center gap-3">
                {/* Participant Count */}
                <div className="flex items-center gap-2 bg-base-300/50 px-3 py-1.5 rounded-full border border-base-300">
                  <Users size={16} className="text-primary" />
                  <span className="text-sm font-medium">{participants.length}</span>
                </div>
              </div>
            </div>

            {/* Center Section - Media Controls */}
            <div className="flex items-center gap-2">
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
                    <span className="hidden sm:inline text-sm ml-1.5">Leaving...</span>
                  </>
                ) : (
                  <>
                    <LogOut size={18} className="sm:mr-1.5" />
                    <span className="hidden sm:inline text-sm font-medium">Leave</span>
                  </>
                )}
              </button>
            </div>

            {/* Right Section - Reserved for Sidebar Toggle (comes from SessionSidebar) */}
            <div className="w-10 sm:w-12 shrink-0">
              {/* Empty space reserved for SessionSidebar toggle button */}
            </div>
          </div>

          {/* Mobile Stats Row */}
          <div className="flex md:hidden items-center gap-2 mt-3 pt-3 border-t border-base-300">
            <div className="flex items-center gap-2 bg-base-300/50 px-2.5 py-1 rounded-full border border-base-300 text-xs">
              <Users size={14} className="text-primary" />
              <span className="font-medium">{participants.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive Grid Layout for participants - aligned to top */}
      <div className="flex-1 overflow-auto bg-base-300 p-2 sm:p-4">
        <div
          className="w-full max-w-7xl mx-auto grid gap-2 sm:gap-3 md:gap-4 content-start"
          style={{
            gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
            minHeight: "min-content",
          }}
        >
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
                <ParticipantView
                  participant={participant}
                  ParticipantViewUI={null}
                />

                {/* Top overlay - Name and grinding topic */}
                <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2">
                  <div className="flex justify-between bg-base-100/90 backdrop-blur-xs px-3 py-2 rounded-lg shadow-lg flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/profile/${participant.userId}`}
                        className="text-sm font-bold text-base-content truncate hover:text-primary transition-colors block"
                      >
                        {participant.name || "Anonymous"}
                        {isMe && (
                          <span className="text-primary ml-1">(You)</span>
                        )}
                      </Link>
                      {grindingTopic && (
                        <p className="text-xs text-base-content/70 truncate mt-1">
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
                        className="btn btn-error btn-sm gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg shrink-0"
                        title="Remove from stream"
                      >
                        <UserX size={16} />
                        <span className="hidden sm:inline text-xs">Remove</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Bottom overlay - Media status indicators */}
                <div className="absolute bottom-2 left-2 flex items-center gap-2">
                  {hasVideoOn ? (
                    <div className="bg-base-100/90 backdrop-blur-xs p-1.5 rounded-full shadow-lg">
                      <Video size={16} />
                    </div>
                  ) : (
                    <div className="bg-base-100/90 backdrop-blur-xs p-1.5 rounded-full shadow-lg">
                      <VideoOff size={16} className="text-error" />
                    </div>
                  )}
                  {hasAudioOn ? (
                    <div className="bg-base-100/90 backdrop-blur-xs p-1.5 rounded-full shadow-lg">
                      <Mic size={16} />
                    </div>
                  ) : (
                    <div className="bg-base-100/90 backdrop-blur-xs p-1.5 rounded-full shadow-lg">
                      <MicOff size={16} className="text-error" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </StreamTheme>
  );
};

export default StreamRoomPage;
