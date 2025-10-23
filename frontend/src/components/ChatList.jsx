import { useChatContext } from "stream-chat-react";
import { useEffect, useState } from "react";

const ChatList = ({ onSelectChat, selectedChatId }) => {
  const { client } = useChatContext();
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client) return;

    const fetchChannels = async () => {
      try {
        const filter = {
          type: "messaging",
          members: { $in: [client.userID] },
        };
        const sort = { last_message_at: -1 };

        const channels = await client.queryChannels(filter, sort, {
          watch: true,
          state: true,
        });

        setChannels(channels);
      } catch (error) {
        console.error("Error fetching channels:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();

    // Listen for new messages to update the list
    const handleEvent = () => {
      fetchChannels();
    };

    client.on("message.new", handleEvent);
    client.on("channel.updated", handleEvent);

    return () => {
      client.off("message.new", handleEvent);
      client.off("channel.updated", handleEvent);
    };
  }, [client]);

  const getOtherMember = (channel) => {
    const members = Object.values(channel.state.members);
    return members.find((member) => member.user.id !== client.userID)?.user;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // Less than a day
    if (diff < 86400000) {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }

    // Less than a week
    if (diff < 604800000) {
      return date.toLocaleDateString("en-US", { weekday: "short" });
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <div className="text-6xl mb-4">💬</div>
        <h3 className="text-xl font-semibold mb-2">No chats yet</h3>
        <p className="text-base-content/60">
          Start a conversation with your friends!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-base-300">
        <h2 className="text-2xl font-bold">Messages</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {channels.map((channel) => {
          const otherMember = getOtherMember(channel);
          const lastMessage = channel.state.messages[channel.state.messages.length - 1];
          const isSelected = selectedChatId === channel.id;

          return (
            <div
              key={channel.id}
              onClick={() => onSelectChat(channel)}
              className={`flex items-center gap-3 p-4 cursor-pointer transition-colors border-b border-base-300 hover:bg-base-200 ${
                isSelected ? "bg-base-200" : ""
              }`}
            >
              <div className="avatar">
                <div className="w-12 h-12 rounded-full">
                  <img
                    src={otherMember?.image || "/avatar.png"}
                    alt={otherMember?.name || "User"}
                  />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold truncate">
                    {otherMember?.name || "Unknown User"}
                  </h3>
                  <span className="text-xs text-base-content/60 flex-shrink-0 ml-2">
                    {formatTimestamp(lastMessage?.created_at)}
                  </span>
                </div>
                <p className="text-sm text-base-content/60 truncate">
                  {lastMessage?.text || "No messages yet"}
                </p>
              </div>

              {channel.countUnread() > 0 && (
                <div className="badge badge-primary badge-sm">
                  {channel.countUnread()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChatList;
