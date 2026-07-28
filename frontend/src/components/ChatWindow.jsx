import {
  MessageInput,
  MessageList,
  Thread,
  Window,
  Channel,
  useChannelStateContext,
} from "stream-chat-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Building2, DoorOpen, Users, Video } from "lucide-react";
import toast from "react-hot-toast";

import { channelKind } from "../lib/chat";

/**
 * The header answers "where am I talking, and what can I do from here?" — which
 * differs by surface. A room conversation offers the room floor, a team
 * conversation offers the team, a direct message offers a call.
 */
const ChatHeader = ({ onBack }) => {
  const { channel, members } = useChannelStateContext();
  const kind = channelKind(channel);
  const subjectId = channel.data?.kendroSubjectId;
  const navigate = useNavigate();
  const [isStartingCall, setIsStartingCall] = useState(false);

  const memberList = Object.values(members || channel.state.members || {});
  const other = memberList.find(
    (member) => member.user?.id !== channel._client.userID
  )?.user;

  // The link is posted before navigating so the other person has a way in even
  // if they are not looking at the chat. The send was previously left dangling,
  // which meant a failure surfaced as an unhandled rejection and the button
  // gave no sign it had done anything.
  const startCall = async () => {
    setIsStartingCall(true);
    try {
      await channel.sendMessage({
        text: `Started a call. Join here: ${window.location.origin}/call/${channel.id}`,
      });
    } catch {
      toast.error("Couldn't post the call link. Starting the call anyway.");
    }
    navigate(`/call/${channel.id}`);
  };

  return (
    <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 border-b border-base-300 bg-base-100">
      <button
        onClick={onBack}
        className="sm:hidden btn btn-ghost btn-xs btn-circle shrink-0"
        aria-label="Back to conversations"
      >
        <ArrowLeft className="size-4" />
      </button>

      {kind === "dm" ? (
        <>
          <Link to={`/profile/${other?.id}`} className="shrink-0">
            <img
              src={other?.image || "/blank-pp.png"}
              alt=""
              className="size-9 sm:size-10 rounded-full object-cover"
            />
          </Link>
          <div className="flex-1 min-w-0">
            <Link
              to={`/profile/${other?.id}`}
              className="font-semibold text-sm sm:text-base truncate block hover:text-primary transition-colors"
            >
              {other?.name || "Conversation"}
            </Link>
            <p className="text-xs text-base-content/60">Direct message</p>
          </div>
          <button
            onClick={startCall}
            className="btn btn-sm btn-primary gap-1.5 shrink-0"
            disabled={isStartingCall}
          >
            {isStartingCall ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <Video className="size-4" />
            )}
            <span className="hidden sm:inline">Call</span>
          </button>
        </>
      ) : (
        <>
          <span className="grid place-items-center size-9 sm:size-10 rounded-field bg-base-300 shrink-0">
            {kind === "team" ? (
              <Building2 className="size-5 text-base-content/60" />
            ) : (
              <DoorOpen className="size-5 text-base-content/60" />
            )}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm sm:text-base truncate">
              {channel.data?.name || "Conversation"}
            </p>
            <p className="text-xs text-base-content/60 inline-flex items-center gap-1">
              <Users className="size-3" />
              {memberList.length}{" "}
              {memberList.length === 1 ? "member" : "members"}
            </p>
          </div>
          {subjectId &&
            (kind === "room" ? (
              <div className="flex gap-1.5 shrink-0">
                <Link
                  to={`/rooms/${subjectId}`}
                  className="btn btn-sm btn-ghost hidden sm:inline-flex"
                >
                  Room
                </Link>
                <Link
                  to={`/rooms/${subjectId}/stream`}
                  className="btn btn-sm btn-primary gap-1.5"
                >
                  <Video className="size-4" />
                  <span className="hidden sm:inline">Take a desk</span>
                </Link>
              </div>
            ) : (
              <Link
                to={`/teams/${subjectId}`}
                className="btn btn-sm btn-ghost shrink-0"
              >
                Open team
              </Link>
            ))}
        </>
      )}
    </div>
  );
};

const ChatWindow = ({ channel, onBack }) => {
  const navigate = useNavigate();

  const handleBack = () => (onBack ? onBack() : navigate("/chats"));

  return (
    <Channel channel={channel}>
      <div className="w-full h-full flex flex-col bg-base-100 str-chat-theme-wrapper">
        <Window hideOnThread>
          <ChatHeader onBack={handleBack} />
          <MessageList />
          <MessageInput
            additionalTextareaProps={{ className: "text-base-content" }}
          />
        </Window>
      </div>
      <Thread />
    </Channel>
  );
};

export default ChatWindow;
