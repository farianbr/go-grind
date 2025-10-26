import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSpaceById, getStreamToken, joinStream, leaveStream, removeFromStream } from "../lib/api";

import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  StreamTheme,
  CallingState,
  useCallStateHooks,
  ParticipantView,
} from "@stream-io/video-react-sdk";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import toast from "react-hot-toast";
import PageLoader from "../components/PageLoader";
import { Video, VideoOff, Mic, MicOff, Users, Clock, LogOut, UserX } from "lucide-react";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const StreamRoomPage = () => {
  const { id: spaceId } = useParams();
  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(true);
  const [grindingTopic, setGrindingTopic] = useState("");
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const clientRef = useRef(null);
  const hasInitializedRef = useRef(false);
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
    mutationFn: ({ spaceId, grindingTopic, isVideoEnabled, isAudioEnabled }) =>
      joinStream(spaceId, { grindingTopic, isVideoEnabled, isAudioEnabled }),
    onSuccess: () => {
      toast.success("Joined the stream!");
      queryClient.invalidateQueries({ queryKey: ["space", spaceId] });
      setShowJoinModal(false);
      hasInitializedRef.current = false; // Reset so video initialization can run
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to join stream");
    },
  });

  // Remove from stream mutation (admin only)
  const { mutate: removeUserMutation } = useMutation({
    mutationFn: ({ spaceId, userId }) => removeFromStream(spaceId, userId),
    onSuccess: (data) => {
      toast.success("User removed from stream");
      // Update the cache immediately with the response data
      queryClient.setQueryData(["space", spaceId], data);
      queryClient.invalidateQueries({ queryKey: ["space", spaceId] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to remove user");
    },
  });

  // Check if user is already in stream - MUST BE BEFORE useEffect hooks
  const isUserInStream = space?.activeStreams?.some(
    (stream) => stream.user?._id === authUser?._id || stream.user === authUser?._id
  );

  // Check if user is creator
  const isCreator = space?.creator._id === authUser?._id;

  // Get active session
  const activeSession = space?.sessions?.find(
    (session) => session._id === space.activeSessionId
  );

  // Check localStorage for active stream state
  useEffect(() => {
    if (authUser && spaceId) {
      const storageKey = `stream_${authUser._id}_${spaceId}`;
      const storedState = localStorage.getItem(storageKey);
      
      if (storedState === 'active' && isUserInStream) {
        console.log("Found active stream in localStorage, skipping join modal");
        setShowJoinModal(false);
      }
    }
  }, [authUser, spaceId, isUserInStream]);

  // Set showJoinModal to false if user is already in stream (for rejoin/refresh)
  useEffect(() => {
    if (isUserInStream && showJoinModal) {
      console.log("User already in stream, skipping join modal");
      setShowJoinModal(false);
    }
  }, [isUserInStream, showJoinModal]);

  // Initialize video call
  useEffect(() => {
    let mounted = true;

    const initCall = async () => {
      // Don't initialize if still showing join modal or if user not in stream
      if (showJoinModal || !isUserInStream) {
        setIsConnecting(false);
        return;
      }

      if (!tokenData?.token || !authUser || !spaceId) {
        setIsConnecting(false);
        return;
      }

      try {
        console.log("Initializing Stream video client...");
        
        const user = {
          id: authUser._id,
          name: authUser.fullName,
          image: authUser.profilePic,
        };

        // Use getOrCreateInstance to reuse existing client
        let videoClient = clientRef.current;
        
        if (!videoClient) {
          console.log("Creating new StreamVideoClient instance");
          videoClient = StreamVideoClient.getOrCreateInstance({
            apiKey: STREAM_API_KEY,
            user,
            token: tokenData.token,
          });
          clientRef.current = videoClient;
        } else {
          console.log("Reusing existing StreamVideoClient instance");
        }

        // Get the call instance
        const callInstance = videoClient.call("default", spaceId);
        
        // Check if we're already in this specific call by checking the SDK state
        const existingCall = videoClient.state.calls.find(c => c.id === spaceId);
        const isAlreadyInCall = existingCall && existingCall.state.callingState !== CallingState.LEFT;
        
        if (isAlreadyInCall) {
          console.log("Already in this call, reusing existing connection");
          // Use the existing call from state instead of creating new one
        } else {
          console.log("Joining call...");
          await callInstance.join({ create: true });
          console.log("Successfully joined call");
        }

        if (mounted) {
          console.log("Setting client and call state");
          setClient(videoClient);
          setCall(callInstance);
          hasInitializedRef.current = true;
          
          // Store active stream state in localStorage
          const storageKey = `stream_${authUser._id}_${spaceId}`;
          localStorage.setItem(storageKey, 'active');
          
          // Small delay to ensure call state is ready before showing UI
          setTimeout(() => {
            if (mounted) {
              console.log("Hiding loader, showing video UI");
              setIsConnecting(false);
            }
          }, 500);
        }
      } catch (error) {
        console.error("Error joining call:", error);
        hasInitializedRef.current = false; // Reset on error so user can retry
        if (mounted) {
          toast.error("Could not join the video call. Please try again.");
          setIsConnecting(false);
        }
      }
    };

    initCall();

    return () => {
      mounted = false;
    };
  }, [tokenData, authUser, spaceId, showJoinModal, isUserInStream]);



  // Handle join stream
  const handleJoinStream = () => {
    if (!grindingTopic.trim()) {
      toast.error("Please enter what you're grinding");
      return;
    }

    joinStreamMutation({
      spaceId,
      grindingTopic: grindingTopic.trim(),
      isVideoEnabled: videoEnabled,
      isAudioEnabled: audioEnabled,
    });
  };

  // Handle leave stream - integrate with Stream SDK's end call
  const handleLeaveStream = async () => {
    try {
      // Leave the video call
      if (call) {
        await call.leave();
      }

      // Leave backend stream
      await leaveStream(spaceId);
      
      // Reset state for potential rejoin
      setClient(null);
      setCall(null);
      hasInitializedRef.current = false;
      
      // Clear localStorage
      if (authUser) {
        const storageKey = `stream_${authUser._id}_${spaceId}`;
        localStorage.removeItem(storageKey);
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

  // Handle remove user
  const handleRemoveUser = (userId) => {
    if (window.confirm("Are you sure you want to remove this user from the stream?")) {
      removeUserMutation({ spaceId, userId });
    }
  };

  // Prevent page reload when user is in stream
  useEffect(() => {
    if (isUserInStream) {
      const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = '';
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [isUserInStream]);

  // Clean up localStorage if user is no longer in stream
  useEffect(() => {
    if (authUser && spaceId && !isUserInStream) {
      const storageKey = `stream_${authUser._id}_${spaceId}`;
      const storedState = localStorage.getItem(storageKey);
      
      if (storedState === 'active') {
        console.log("User no longer in stream, clearing localStorage");
        localStorage.removeItem(storageKey);
      }
    }
  }, [authUser, spaceId, isUserInStream]);

  if (authLoading || spaceLoading) return <PageLoader />;

  // Join Modal
  if (showJoinModal && !isUserInStream) {
    return (
      <div className="flex items-center justify-center bg-base-200" style={{ height: 'calc(100vh - 64px)' }}>
        <div className="card w-full max-w-lg bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-2xl">Join Stream Room</h2>
            <p className="text-base-content/60">Space: {space?.name}</p>

            {/* Active Session Info */}
            {activeSession && (
              <div className="alert alert-info mt-4">
                <div>
                  <h3 className="font-bold">{activeSession.title}</h3>
                  <div className="text-sm mt-1">
                    <p>Duration: {activeSession.duration} minutes</p>
                    <p>Participants: {activeSession.participants?.length || 0}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">What are you grinding?</span>
              </label>
              <input
                type="text"
                placeholder="e.g., React components, Math problems, etc."
                className="input input-bordered"
                value={grindingTopic}
                onChange={(e) => setGrindingTopic(e.target.value)}
              />
            </div>

            <div className="flex gap-4 mt-4">
              <div className="form-control">
                <label className="label cursor-pointer gap-2">
                  {videoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
                  <span className="label-text">Video</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={videoEnabled}
                    onChange={(e) => setVideoEnabled(e.target.checked)}
                  />
                </label>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer gap-2">
                  {audioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                  <span className="label-text">Audio</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={audioEnabled}
                    onChange={(e) => setAudioEnabled(e.target.checked)}
                  />
                </label>
              </div>
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
                disabled={isJoining}
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

  if (isConnecting) return <PageLoader />;

  return (
    <div className="flex flex-col bg-base-200" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Video Call Area - Full width, no sidebar */}
      <div className="flex-1 overflow-auto bg-base-300">
        {client && call ? (
          <StreamVideo client={client}>
            <StreamCall call={call}>
              <CallContent 
                space={space} 
                authUser={authUser} 
                isCreator={isCreator} 
                removeUser={handleRemoveUser}
                activeSession={activeSession}
                onLeaveStream={handleLeaveStream}
              />
            </StreamCall>
          </StreamVideo>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p>Could not initialize video call. Please refresh or try again later.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const CallContent = ({ space, authUser, isCreator, removeUser, activeSession, onLeaveStream }) => {
  const { useCallCallingState, useParticipants, useMicrophoneState, useCameraState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participants = useParticipants();
  const { microphone, isMute: isMicMuted } = useMicrophoneState();
  const { camera, isMute: isCamMuted } = useCameraState();

  const toggleMicrophone = async () => {
    try {
      if (isMicMuted) {
        await microphone.enable();
      } else {
        await microphone.disable();
      }
    } catch (error) {
      console.error('Error toggling microphone:', error);
      toast.error('Failed to toggle microphone');
    }
  };

  const toggleCamera = async () => {
    try {
      if (isCamMuted) {
        await camera.enable();
      } else {
        await camera.disable();
      }
    } catch (error) {
      console.error('Error toggling camera:', error);
      toast.error('Failed to toggle camera');
    }
  };

  if (callingState === CallingState.LEFT) return null;

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
    const stream = space?.activeStreams?.find(s => 
      s.user?._id === participantUserId || s.user === participantUserId
    );
    return stream?.grindingTopic || '';
  };

  return (
    <StreamTheme className="h-full w-full flex flex-col">
      {/* Header with Controls */}
      <div className="bg-base-100 shadow-lg p-4 flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 max-w-full mx-auto px-2">
          <div className="flex-shrink-0">
            <h1 className="text-xl sm:text-2xl font-bold">{space?.name}</h1>
            {activeSession && (
              <p className="text-xs sm:text-sm text-base-content/60">
                Session: {activeSession.title}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            {/* Participant Count */}
            <div className="flex items-center gap-2 bg-base-200 px-3 py-2 rounded-lg text-sm">
              <Users size={18} />
              <span className="font-semibold">
                {participants.length}
              </span>
            </div>

            {/* Session Duration */}
            {activeSession && (
              <div className="flex items-center gap-2 bg-base-200 px-3 py-2 rounded-lg text-sm">
                <Clock size={18} />
                <span className="font-semibold">{activeSession.duration}m</span>
              </div>
            )}

            {/* Camera Toggle */}
            <button
              onClick={toggleCamera}
              className={`btn btn-sm sm:btn-md ${isCamMuted ? 'btn-error' : 'btn-ghost'}`}
              title={isCamMuted ? 'Turn on camera' : 'Turn off camera'}
            >
              {isCamMuted ? <VideoOff size={18} /> : <Video size={18} />}
            </button>

            {/* Microphone Toggle */}
            <button
              onClick={toggleMicrophone}
              className={`btn btn-sm sm:btn-md ${isMicMuted ? 'btn-error' : 'btn-ghost'}`}
              title={isMicMuted ? 'Unmute' : 'Mute'}
            >
              {isMicMuted ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            {/* Leave Button */}
            <button
              className="btn btn-error btn-sm sm:btn-md gap-2"
              onClick={onLeaveStream}
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Leave Stream</span>
            </button>
          </div>
        </div>
      </div>

      {/* Responsive Grid Layout for participants - aligned to top */}
      <div className="flex-1 overflow-auto bg-base-300 p-2 sm:p-4">
        <div 
          className="w-full max-w-7xl mx-auto grid gap-2 sm:gap-3 md:gap-4 content-start"
          style={{
            gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
            minHeight: 'min-content',
          }}
        >
          {participants.map((participant) => {
            const grindingTopic = getGrindingInfo(participant.userId);
            const isMe = participant.userId === authUser?._id;
            const hasVideo = participant.videoStream !== undefined || participant.isVideoEnabled;
            const hasAudio = participant.audioStream !== undefined || participant.isAudioEnabled;
            
            return (
              <div 
                key={participant.sessionId} 
                className="relative bg-base-300 rounded-lg overflow-hidden shadow-xl"
                style={{
                  aspectRatio: '16/9',
                  maxHeight: participants.length === 1 ? '600px' : '350px',
                  width: '100%',
                }}
              >
                <ParticipantView 
                  participant={participant}
                  ParticipantViewUI={null}
                />
                
                {/* Top overlay - Name and grinding topic */}
                <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2">
                  <div className="bg-base-100/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg flex-1 min-w-0">
                    <p className="text-sm font-bold text-base-content truncate">
                      {participant.name || 'Anonymous'}
                      {isMe && <span className="text-primary ml-1">(You)</span>}
                    </p>
                    {grindingTopic && (
                      <p className="text-xs text-base-content/70 truncate mt-1">
                        Focusing on: {grindingTopic}
                      </p>
                    )}
                  </div>
                  
                  {/* Remove button for creator */}
                  {isCreator && !isMe && (
                    <button
                      onClick={() => removeUser(participant.userId)}
                      className="btn btn-error btn-xs btn-circle shadow-lg"
                      title="Remove from stream"
                    >
                      <UserX size={14} />
                    </button>
                  )}
                </div>

                {/* Bottom overlay - Media status indicators */}
                <div className="absolute bottom-2 left-2 flex items-center gap-2">
                  {!hasVideo && (
                    <div className="bg-base-100/90 backdrop-blur-sm p-1.5 rounded-full shadow-lg">
                      <VideoOff size={16} className="text-error" />
                    </div>
                  )}
                  {!hasAudio && (
                    <div className="bg-base-100/90 backdrop-blur-sm p-1.5 rounded-full shadow-lg">
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
