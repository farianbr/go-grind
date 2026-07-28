import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import useAuthUser from "../hooks/useAuthUser";
import { getStreamToken } from "../lib/api";

import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  CallControls,
  SpeakerLayout,
  StreamTheme,
  CallingState,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import toast from "react-hot-toast";
import PageLoader from "../components/PageLoader";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

/**
 * A one-to-one call, reached from a direct message. Shared rooms have their own
 * surface at /rooms/:id/stream; this is the smaller case of two people pairing
 * on something.
 */
const CallPage = () => {
  const { id: callId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [failed, setFailed] = useState(false);

  const { authUser, isLoading } = useAuthUser();

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser,
  });

  useEffect(() => {
    // The token arrives a tick after mount; reading through it unguarded threw
    // before the try block could catch it and left the page on its loader.
    if (!tokenData?.token || !authUser || !callId) return;

    let cancelled = false;
    let joined = null;
    let created = null;

    const initCall = async () => {
      try {
        const videoClient = new StreamVideoClient({
          apiKey: STREAM_API_KEY,
          user: {
            id: authUser._id,
            name: authUser.fullName,
            image: authUser.profilePic,
          },
          token: tokenData.token,
        });
        created = videoClient;

        const callInstance = videoClient.call("default", callId);
        await callInstance.join({ create: true });
        joined = callInstance;

        if (cancelled) return;
        setClient(videoClient);
        setCall(callInstance);
      } catch {
        if (!cancelled) {
          setFailed(true);
          toast.error("Could not join the call.");
        }
      } finally {
        if (!cancelled) setIsConnecting(false);
      }
    };

    initCall();

    return () => {
      cancelled = true;
      joined?.leave().catch(() => {});
      created?.disconnectUser().catch(() => {});
    };
  }, [tokenData?.token, authUser, callId]);

  if (isLoading || isConnecting) return <PageLoader />;

  if (failed || !client || !call) {
    return (
      <div className="min-h-dvh grid place-items-center p-6 bg-base-200">
        <div className="text-center max-w-sm space-y-4">
          <h1 className="text-xl font-bold">That call would not open</h1>
          <p className="text-sm text-base-content/60">
            The link may have expired, or your browser blocked camera and
            microphone access.
          </p>
          <button onClick={() => navigate(-1)} className="btn btn-primary">
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col bg-base-300">
      <StreamVideo client={client}>
        <StreamCall call={call}>
          <CallSurface onExit={() => navigate("/chats")} />
        </StreamCall>
      </StreamVideo>
    </div>
  );
};

const CallSurface = ({ onExit }) => {
  const { useCallCallingState, useParticipants } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participants = useParticipants();
  const exited = useRef(false);

  useEffect(() => {
    // Navigating from inside render is a side effect; leaving is a real one.
    if (callingState === CallingState.LEFT && !exited.current) {
      exited.current = true;
      onExit();
    }
  }, [callingState, onExit]);

  if (callingState === CallingState.RECONNECTING) {
    return (
      <div className="flex-1 grid place-items-center">
        <div className="alert alert-warning max-w-sm">
          <span className="loading loading-spinner loading-sm" />
          <span>Reconnecting</span>
        </div>
      </div>
    );
  }

  const others = participants.filter((p) => !p.isLocalParticipant);

  return (
    <StreamTheme className="flex-1 flex flex-col min-h-0">
      <header className="flex items-center gap-3 px-4 py-3 bg-base-100 border-b border-base-300 shrink-0">
        <button
          onClick={onExit}
          className="btn btn-ghost btn-sm btn-circle"
          aria-label="Leave and go back"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">
            {others.length === 0
              ? "Waiting for the other person"
              : others.map((p) => p.name).join(", ")}
          </p>
          <p className="text-xs text-base-content/60">
            {participants.length}{" "}
            {participants.length === 1 ? "person" : "people"} on the call
          </p>
        </div>
      </header>

      <div className="flex-1 min-h-0">
        <SpeakerLayout />
      </div>

      <div className="shrink-0 py-3 grid place-items-center bg-base-100 border-t border-base-300">
        <CallControls />
      </div>
    </StreamTheme>
  );
};

export default CallPage;
