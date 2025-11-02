import {
  MessageInput,
  MessageList,
  Thread,
  Window,
  Channel,
  useChannelStateContext,
} from "stream-chat-react";
import { Link, useNavigate } from "react-router";
import toast from "react-hot-toast";
import CallButton from "./CallButton";
import { ArrowLeft } from "lucide-react";

const CustomChannelHeader = ({ onBack }) => {
  const { channel } = useChannelStateContext();
  
  const getOtherMember = () => {
    const members = Object.values(channel.state.members);
    return members.find((member) => member.user.id !== channel._client.userID)?.user;
  };

  const otherMember = getOtherMember();


  return (
    <div className="str-chat__header-livestream flex items-center gap-2 sm:gap-3 p-3 sm:p-4 border-b border-base-300 bg-base-100">
      {/* Mobile back button */}
      <button
        onClick={onBack}
        className="sm:hidden btn btn-ghost btn-xs btn-circle shrink-0"
        aria-label="Back to chat list"
      >
        <ArrowLeft size={18} />
      </button>

      {/* User info */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        <Link to={`/profile/${otherMember?.id}`}>
        <div className="avatar">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full">
            <img
              src={otherMember?.image || "/avatar.png"}
              alt={otherMember?.name || "User"}
            />
          </div>
        </div>
        </Link>
        <div className="flex-1 min-w-0">
          <Link to={`/profile/${otherMember?.id}`}>
            <h3 className="font-semibold truncate text-sm sm:text-base text-base-content hover:text-primary transition-colors">{otherMember?.name || "Chat"}</h3>
          </Link>
            <p className="text-xs sm:text-sm text-base-content/60">Active</p>
        </div>
      </div>
    </div>
  );
};

const ChatWindow = ({ channel, onBack }) => {
  const navigate = useNavigate();

  const handleVideoCall = () => {
    if (channel) {
      const callUrl = `${window.location.origin}/call/${channel.id}`;

      channel.sendMessage({
        text: `I've started a video call. Join me here: ${callUrl}`,
      });

      toast.success("Video call link sent successfully!");
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate("/chats");
    }
  };

  return (
    <Channel channel={channel}>
      <div className="w-full h-full flex flex-col bg-base-100 str-chat-theme-wrapper">
        <CallButton handleVideoCall={handleVideoCall} />
        <Window hideOnThread>
          <CustomChannelHeader onBack={handleBack} />
          <MessageList />
          <MessageInput  />
        </Window>
      </div>
      <Thread />
    </Channel>
  );
};

export default ChatWindow;
