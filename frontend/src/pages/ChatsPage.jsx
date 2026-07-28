import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate, useSearchParams, Link } from "react-router";
import { Chat } from "stream-chat-react";
import { StreamChat } from "stream-chat";
import toast from "react-hot-toast";
import { Building2, DoorOpen, MessagesSquare } from "lucide-react";

import useAuthUser from "../hooks/useAuthUser";
import { getStreamToken, syncChatChannels } from "../lib/api";
import ChatLoader from "../components/ChatLoader";
import ChatList from "../components/ChatList";
import ChatWindow from "../components/ChatWindow";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const ChatsPage = () => {
  const { id: targetUserId } = useParams();
  const [searchParams] = useSearchParams();
  // Rooms and teams link straight at their channel, e.g. /chats?channel=room-abc
  const targetChannelId = searchParams.get("channel");
  const navigate = useNavigate();

  const [chatClient, setChatClient] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const clientRef = useRef(null);

  const { authUser } = useAuthUser();

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser,
  });

  // Reconcile room and team channels before connecting, so a member who joined
  // a room five minutes ago finds its conversation already waiting.
  // isFetched, not isSuccess: a failed sync still has to release the list, and
  // waiting for it to settle means the list is queried once instead of twice.
  const { isFetched: syncSettled } = useQuery({
    queryKey: ["chatChannelSync"],
    queryFn: syncChatChannels,
    enabled: !!authUser,
    staleTime: 60_000,
    retry: false,
  });

  const userId = authUser?._id;
  const userName = authUser?.fullName;
  const userImage = authUser?.profilePic;

  useEffect(() => {
    if (!tokenData?.token || !userId) return;

    let cancelled = false;
    const client = StreamChat.getInstance(STREAM_API_KEY);

    const initChat = async () => {
      try {
        // getInstance hands back a singleton. Reconnecting a user who is
        // already connected drops the channel state the list just watched,
        // which made every conversation load a second time.
        if (client.userID !== userId) {
          await client.connectUser(
            { id: userId, name: userName, image: userImage },
            tokenData.token
          );
        }

        if (!cancelled) {
          clientRef.current = client;
          setChatClient(client);
        }
      } catch {
        if (!cancelled) toast.error("Could not connect to chat. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    initChat();

    return () => {
      cancelled = true;
    };
  }, [tokenData?.token, userId, userName, userImage]);

  // Disconnect belongs to leaving the page, not to every dependency change.
  useEffect(
    () => () => {
      clientRef.current?.disconnectUser().catch(() => {
        // Ignore disconnect errors during cleanup
      });
    },
    []
  );

  useEffect(() => {
    const loadChannelFromUrl = async () => {
      if (!chatClient || !targetUserId || !authUser) return;

      try {
        const channelId = [authUser._id, targetUserId].sort().join("-");
        const channel = chatClient.channel("messaging", channelId, {
          members: [authUser._id, targetUserId],
        });

        await channel.watch();
        setSelectedChannel(channel);
      } catch {
        toast.error("Could not load that conversation.");
      }
    };

    loadChannelFromUrl();
  }, [chatClient, targetUserId, authUser]);

  useEffect(() => {
    const loadGroupChannel = async () => {
      if (!chatClient || !targetChannelId) return;

      try {
        const channel = chatClient.channel("team", targetChannelId);
        await channel.watch();
        setSelectedChannel(channel);
      } catch {
        toast.error("That conversation isn't available yet.");
      }
    };

    // Waiting on the sync means a channel created moments ago still resolves.
    if (syncSettled) loadGroupChannel();
  }, [chatClient, targetChannelId, syncSettled]);

  const handleBackToList = () => {
    setSelectedChannel(null);
    navigate("/chats", { replace: true });
  };

  if (loading || !chatClient) {
    return <ChatLoader />;
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden">
      <Chat client={chatClient}>
        <div
          className={`w-full sm:w-64 md:w-72 lg:w-[320px] xl:w-[360px] border-r border-base-300 bg-base-100 shrink-0 ${
            selectedChannel ? "hidden sm:block" : "block"
          }`}
        >
          <ChatList
            ready={syncSettled}
            onSelectChat={setSelectedChannel}
            selectedChatId={selectedChannel?.id}
          />
        </div>

        <div
          className={`flex-1 bg-base-100 min-w-0 ${
            !selectedChannel ? "hidden sm:flex" : "flex"
          }`}
        >
          {selectedChannel ? (
            <div className="w-full h-full">
              <ChatWindow channel={selectedChannel} onBack={handleBackToList} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full w-full p-6 sm:p-8 text-center">
              <span className="grid place-items-center size-14 rounded-field bg-base-200 mb-4">
                <MessagesSquare className="size-7 text-base-content/50" />
              </span>
              <h2 className="text-lg sm:text-xl font-bold mb-2">
                Pick a conversation
              </h2>
              <p className="text-sm text-base-content/60 max-w-sm">
                Rooms and teams each get their own channel. Direct messages sit
                alongside them.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 mt-5">
                <Link to="/rooms" className="btn btn-sm btn-outline gap-1.5">
                  <DoorOpen className="size-4" />
                  Browse rooms
                </Link>
                <Link to="/teams" className="btn btn-sm btn-outline gap-1.5">
                  <Building2 className="size-4" />
                  Your teams
                </Link>
              </div>
            </div>
          )}
        </div>
      </Chat>
    </div>
  );
};

export default ChatsPage;
