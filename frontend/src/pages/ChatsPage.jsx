import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router";
import { Chat } from "stream-chat-react";
import { StreamChat } from "stream-chat";
import toast from "react-hot-toast";

import useAuthUser from "../hooks/useAuthUser";
import { getStreamToken } from "../lib/api";
import ChatLoader from "../components/ChatLoader";
import ChatList from "../components/ChatList";
import ChatWindow from "../components/ChatWindow";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const ChatsPage = () => {
  const { id: targetUserId } = useParams();
  const navigate = useNavigate();
  
  const [chatClient, setChatClient] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [loading, setLoading] = useState(true);

  const { authUser } = useAuthUser();

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser,
  });

  useEffect(() => {
    const initChat = async () => {
      if (!tokenData?.token || !authUser) return;

      try {
        console.log("Initializing stream chat client...");

        const client = StreamChat.getInstance(STREAM_API_KEY);

        await client.connectUser(
          {
            id: authUser._id,
            name: authUser.fullName,
            image: authUser.profilePic,
          },
          tokenData.token
        );

        setChatClient(client);
      } catch (error) {
        console.error("Error initializing chat:", error);
        toast.error("Could not connect to chat. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    initChat();

    return () => {
      // Cleanup will be handled when client reference changes
    };
  }, [authUser, tokenData?.token]);

  // Handle URL parameter to open specific chat
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
      } catch (error) {
        console.error("Error loading channel from URL:", error);
        toast.error("Could not load chat. Please try again.");
      }
    };

    loadChannelFromUrl();
  }, [chatClient, targetUserId, authUser]);

  const handleSelectChat = (channel) => {
    setSelectedChannel(channel);
    // Optionally update URL without page reload
    // navigate(`/chats/${getOtherMemberId(channel)}`, { replace: true });
  };

  const handleBackToList = () => {
    setSelectedChannel(null);
    navigate("/chats", { replace: true });
  };

  if (loading || !chatClient) {
    return <ChatLoader />;
  }

  return (
    <div className="h-full flex overflow-hidden">
      <Chat client={chatClient}>
        {/* Left sidebar - Chat list */}
        <div
          className={`w-full md:w-96 lg:w-[400px] xl:w-[450px] border-r border-base-300 bg-base-100 shrink-0 ${
            selectedChannel ? "hidden md:block" : "block"
          }`}
        >
          <ChatList
            onSelectChat={handleSelectChat}
            selectedChatId={selectedChannel?.id}
          />
        </div>

        {/* Right side - Chat window */}
        <div
          className={`flex-1 bg-base-100 min-w-0 ${
            !selectedChannel ? "hidden md:flex" : "flex"
          }`}
        >
          {selectedChannel ? (
            <div className="w-full h-full">
              <ChatWindow channel={selectedChannel} onBack={handleBackToList} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full w-full p-4 sm:p-8 text-center">
              <div className="text-6xl sm:text-8xl mb-4 sm:mb-6">💬</div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3">Welcome to Messages</h2>
              <p className="text-base-content/60 text-base sm:text-lg max-w-md px-4">
                Select a conversation from the left to start chatting with your
                friends.
              </p>
            </div>
          )}
        </div>
      </Chat>
    </div>
  );
};

export default ChatsPage;
