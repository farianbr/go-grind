import {
  ChannelHeader,
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
    <div className="str-chat__header-livestream flex items-center gap-3 p-4 border-b border-base-300 bg-base-100">
      {/* Mobile back button */}
      <button
        onClick={onBack}
        className="md:hidden btn btn-ghost btn-sm btn-circle shrink-0"
        aria-label="Back to chat list"
      >
        <ArrowLeft size={20} />
      </button>

      {/* User info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Link to={`/profile/${otherMember?.id}`}>
        <div className="avatar">
          <div className="w-10 h-10 rounded-full ">
            <img
              src={otherMember?.image || "/avatar.png"}
              alt={otherMember?.name || "User"}
            />
          </div>
        </div>
        </Link>
        <div className="flex-1 min-w-0">
          <Link to={`/profile/${otherMember?.id}`}>
            <h3 className="font-semibold truncate text-base-content hover:text-primary transition-colors">{otherMember?.name || "Chat"}</h3>
          </Link>
            <p className="text-sm text-base-content/60">Active</p>
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
          <MessageInput focus />
        </Window>
      </div>
      <Thread />
    </Channel>
  );
};

export default ChatWindow;
