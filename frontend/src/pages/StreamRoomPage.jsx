import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router";
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
  CallingState,
} from "@stream-io/video-react-sdk";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import toast from "react-hot-toast";
import PageLoader from "../components/PageLoader";
import JoinStreamModal from "../components/JoinStreamModal";
import KickUserModal from "../components/KickUserModal";
import CallContent from "../components/CallContent";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const StreamRoomPage = () => {
  const { id: spaceId } = useParams();
  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(true);
  const [kickTargetUser, setKickTargetUser] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const wasKickedRef = useRef(false); // Track if user was kicked to prevent duplicate leave calls
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { authUser, isLoading: authLoading } = useAuthUser();

  const { data: space, isLoading: spaceLoading } = useQuery({
    queryKey: ["space", spaceId],
    queryFn: () => getSpaceById(spaceId),
    enabled: !!spaceId,
    refetchInterval: 10000,
  });

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser,
  });

  const { mutate: joinStreamMutation, isPending: isJoining } = useMutation({
    mutationFn: ({
      spaceId,
      grindingTopic,
      targetDuration,
      tasks,
      isVideoEnabled,
      isAudioEnabled,
    }) =>
      joinStream(spaceId, {
        grindingTopic,
        targetDuration,
        tasks,
        isVideoEnabled,
        isAudioEnabled,
      }),
    onSuccess: (data, variables) => {
      const storageKey = `stream_${authUser._id}_${spaceId}_active`;
      localStorage.setItem(storageKey, "active");
      localStorage.setItem(
        `stream_${authUser._id}_${spaceId}_audio`,
        variables.isAudioEnabled ? "active" : "inactive"
      );
      localStorage.setItem(
        `stream_${authUser._id}_${spaceId}_video`,
        variables.isVideoEnabled ? "active" : "inactive"
      );
      queryClient.invalidateQueries({ queryKey: ["space", spaceId] });
      setShowJoinModal(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to join stream");
    },
  });

  const { mutate: removeUserMutation } = useMutation({
    mutationFn: ({ spaceId, userId, reason }) =>
      removeFromStream(spaceId, userId, reason),
    onSuccess: (data) => {
      toast.success("User removed from stream");
      queryClient.setQueryData(["space", spaceId], data);
      queryClient.invalidateQueries({ queryKey: ["space", spaceId] });
      queryClient.invalidateQueries({ queryKey: ["stream", spaceId] });

      setKickTargetUser(null);
      setIsRemoving(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to remove user");
      setIsRemoving(false);
    },
  });

  const isUserInStream = space?.activeStreams?.some(
    (stream) =>
      stream.user?._id === authUser?._id || stream.user === authUser?._id
  );

  const isCreator = space?.creator._id === authUser?._id;

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

    return () => {
      videoClient
        .disconnectUser()
        .catch(() => {
          // Ignore disconnect errors during cleanup
        });
      setClient(null);
    };
  }, [tokenData, authUser, showJoinModal]);

  useEffect(() => {
    if (!client || !spaceId || !isUserInStream || showJoinModal) {
      return;
    }

    const callInstance = client.call("default", spaceId);
    const kickedRef = wasKickedRef; // Capture the ref itself for cleanup

    callInstance.microphone.disableSpeakingWhileMutedNotification();

    const videoStorageKey = `stream_${authUser._id}_${spaceId}_video`;
    const audioStorageKey = `stream_${authUser._id}_${spaceId}_audio`;

    if (localStorage.getItem(videoStorageKey) === "inactive") {
      callInstance.camera.disable();
    }

    if (localStorage.getItem(audioStorageKey) === "inactive") {
      callInstance.microphone.disable();
    }

    callInstance
      .join({ create: true })
      .then(() => {
        setCall(callInstance);
        toast.success("Joined the stream!");

        if (authUser) {
          const storageKey = `stream_${authUser._id}_${spaceId}_active`;
          localStorage.setItem(storageKey, "active");
        }
      })
      .catch(() => {
        toast.error("Could not join the video call. Please try again.");
        navigate(`/spaces/${spaceId}`);
      });

    return () => {
      try {
        const callingState = callInstance?.state?.callingState;
        if (!kickedRef.current && callingState !== CallingState.LEFT) {
          callInstance.leave().catch(() => {
            // Ignore cleanup errors
          });
        }
      } catch {
        // Defensive: ignore any errors during cleanup
      }
      setCall(null);
    };
  }, [client, spaceId, isUserInStream, showJoinModal, authUser, navigate]);

  const handleJoinStream = (joinData) => {
    joinStreamMutation({
      spaceId,
      ...joinData,
    });
  };

  const handleLeaveStream = async () => {
    try {
      await leaveStream(spaceId);

      if (authUser) {
        localStorage.removeItem(`stream_${authUser._id}_${spaceId}_active`);
        localStorage.removeItem(`stream_${authUser._id}_${spaceId}_video`);
        localStorage.removeItem(`stream_${authUser._id}_${spaceId}_audio`);
      }

      queryClient.invalidateQueries({ queryKey: ["space", spaceId] });
      queryClient.invalidateQueries({ queryKey: ["mySpaces"] });
      toast.success("Left the stream");

      navigate(`/spaces/${spaceId}`);
    } catch {
      toast.error("Failed to leave stream");
    }
  };

  const handleRemoveUser = (userId, userName) => {
    setKickTargetUser({ id: userId, name: userName });
  };

  useEffect(() => {
    if (!authUser || !spaceId) return;

    const wasInStream =
      localStorage.getItem(`stream_${authUser._id}_${spaceId}_active`) ===
      "active";

    if (wasInStream && !isUserInStream && space) {
      wasKickedRef.current = true;

      localStorage.removeItem(`stream_${authUser._id}_${spaceId}_active`);
      localStorage.removeItem(`stream_${authUser._id}_${spaceId}_video`);
      localStorage.removeItem(`stream_${authUser._id}_${spaceId}_audio`);

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

  if (showJoinModal && !isUserInStream) {
    return (
      <JoinStreamModal
        space={space}
        isCreator={isCreator}
        onJoin={handleJoinStream}
        isJoining={isJoining}
        authUser={authUser}
      />
    );
  }

  return (
    <>
      <KickUserModal
        kickTargetUser={kickTargetUser}
        onConfirm={async (reason) => {
          if (!kickTargetUser || !call) return;
          setIsRemoving(true);
          try {
            await call.kickUser({ user_id: kickTargetUser.id });
            removeUserMutation({
              spaceId,
              userId: kickTargetUser.id,
              reason: reason.trim() || "No reason provided",
            });
          } catch {
            toast.error("Failed to kick user");
            setIsRemoving(false);
          }
        }}
        onCancel={() => {
          setKickTargetUser(null);
        }}
        isRemoving={isRemoving}
      />

      <div
        className="flex bg-base-200"
        style={{ height: "calc(100vh - 64px)" }}
      >
        {client && call ? (
          <StreamVideo client={client}>
            <StreamCall call={call}>
              <CallContent
                space={space}
                authUser={authUser}
                isCreator={isCreator}
                removeUser={handleRemoveUser}
                onLeaveStream={handleLeaveStream}
                spaceId={spaceId}
              />
            </StreamCall>
          </StreamVideo>
        ) : (
          <div className="flex items-center justify-center h-full w-full">
            <p>
              Could not initialize video call. Please refresh or try again
              later.
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default StreamRoomPage;
