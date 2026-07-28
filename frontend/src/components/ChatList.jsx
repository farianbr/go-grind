import { useChatContext } from "stream-chat-react";
import { useEffect, useState } from "react";
import {
  Building2,
  ChevronDown,
  DoorOpen,
  MessageSquare,
} from "lucide-react";

import { channelKind } from "../lib/chat";

/**
 * One list, grouped by where the conversation lives.
 *
 * Deliberately not tabbed like the rest of the app: with tabs an unread
 * message can sit behind a segment you are not looking at, and the whole point
 * of the list is to show you what needs answering. Groups collapse instead —
 * that is the reader's own choice, and a collapsed group still shows its
 * unread count on the header so nothing hides silently.
 */
const GROUPS = [
  {
    key: "room",
    label: "Rooms",
    icon: DoorOpen,
    empty: "Join a room and its conversation appears here.",
  },
  {
    key: "team",
    label: "Teams",
    icon: Building2,
    empty: "Your team gets a channel the moment you join one.",
  },
  {
    key: "dm",
    label: "People",
    icon: MessageSquare,
    empty: "Message someone from their profile to start a thread.",
  },
];

const COLLAPSED_KEY = "chatList.collapsedGroups";

// Collapsed groups survive a reload: someone who works out of one team channel
// should not have to fold the other two away every time they open chats.
const readCollapsed = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(COLLAPSED_KEY));
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
};

// `ready` gates the first query on the room/team channel sync. Querying before
// it settles and again after showed every conversation loading twice.
const ChatList = ({ onSelectChat, selectedChatId, ready = true }) => {
  const { client } = useChatContext();
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggleGroup = (key) => {
    setCollapsed((prev) => {
      const next = prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key];
      try {
        localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next));
      } catch {
        // A full or blocked storage costs the preference, not the list.
      }
      return next;
    });
  };

  useEffect(() => {
    if (!client || !ready) return;
    let cancelled = false;

    const fetchChannels = async () => {
      try {
        // Group channels and direct messages are separate types in Stream, so
        // the list is the union of two queries rather than one filter.
        const [groups, dms] = await Promise.all([
          client.queryChannels(
            { type: "team", members: { $in: [client.userID] } },
            { last_message_at: -1 },
            { watch: true, state: true }
          ),
          client.queryChannels(
            { type: "messaging", members: { $in: [client.userID] } },
            { last_message_at: -1 },
            { watch: true, state: true }
          ),
        ]);
        if (!cancelled) setChannels([...groups, ...dms]);
      } catch {
        // A failed refresh keeps whatever is already on screen.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchChannels();

    const handleEvent = () => fetchChannels();
    client.on("message.new", handleEvent);
    client.on("channel.updated", handleEvent);
    client.on("notification.added_to_channel", handleEvent);

    return () => {
      cancelled = true;
      client.off("message.new", handleEvent);
      client.off("channel.updated", handleEvent);
      client.off("notification.added_to_channel", handleEvent);
    };
  }, [client, ready]);

  const otherMember = (channel) =>
    Object.values(channel.state.members).find(
      (member) => member.user?.id !== client.userID
    )?.user;

  const titleFor = (channel) =>
    channelKind(channel) === "dm"
      ? otherMember(channel)?.name || "Unknown person"
      : channel.data?.name || "Untitled";

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const diff = Date.now() - date;

    if (diff < 86400000) {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
    if (diff < 604800000) {
      return date.toLocaleDateString("en-US", { weekday: "short" });
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-base-300">
          <h2 className="text-lg font-bold">Conversations</h2>
        </div>
        <div className="p-3 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <div className="skeleton size-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3 w-2/3" />
                <div className="skeleton h-2.5 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const grouped = GROUPS.map((group) => {
    const items = channels.filter(
      (channel) => channelKind(channel) === group.key
    );
    return {
      ...group,
      items,
      isOpen: !collapsed.includes(group.key),
      unread: items.reduce((total, channel) => total + channel.countUnread(), 0),
    };
  });

  const isEmpty = channels.length === 0;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-base-300 shrink-0">
        <h2 className="text-lg font-bold">Conversations</h2>
        <p className="text-xs text-base-content/60 mt-0.5">
          Every room and team you are in has one
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="p-5 text-sm text-base-content/60 space-y-2">
            <p>No conversations yet.</p>
            <p className="text-xs">
              Rooms and teams get a channel automatically. Join one and it shows
              up here.
            </p>
          </div>
        ) : (
          grouped
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <section key={group.key}>
                <h3 className="sticky top-0 z-10">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    aria-expanded={group.isOpen}
                    aria-controls={`chat-group-${group.key}`}
                    className="w-full flex items-center gap-1.5 bg-base-100/95 backdrop-blur px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-base-content/50 border-b border-base-300 hover:text-base-content transition-colors"
                  >
                    <ChevronDown
                      className={`size-3.5 transition-transform ${
                        group.isOpen ? "" : "-rotate-90"
                      }`}
                    />
                    {group.label}
                    <span className="font-mono tabular-nums text-base-content/40">
                      {group.items.length}
                    </span>
                    {/* Only when folded away: open, the rows carry their own. */}
                    {!group.isOpen && group.unread > 0 && (
                      <span className="badge badge-primary badge-xs ml-auto">
                        {group.unread > 9 ? "9+" : group.unread}
                      </span>
                    )}
                  </button>
                </h3>
                <ul id={`chat-group-${group.key}`} hidden={!group.isOpen}>
                  {group.items.map((channel) => {
                    const kind = channelKind(channel);
                    const person = kind === "dm" ? otherMember(channel) : null;
                    const last =
                      channel.state.messages[channel.state.messages.length - 1];
                    const unread = channel.countUnread();
                    const Icon = group.icon;

                    return (
                      <li key={`${channel.type}-${channel.id}`}>
                        <button
                          type="button"
                          onClick={() => onSelectChat(channel)}
                          aria-current={
                            selectedChatId === channel.id ? "true" : undefined
                          }
                          className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-base-300 transition-colors hover:bg-base-200 ${
                            selectedChatId === channel.id ? "bg-base-200" : ""
                          }`}
                        >
                          {person ? (
                            <img
                              src={person.image || "/blank-pp.png"}
                              alt=""
                              className="size-10 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <span className="grid place-items-center size-10 rounded-field bg-base-300 shrink-0">
                              <Icon className="size-5 text-base-content/60" />
                            </span>
                          )}

                          <span className="flex-1 min-w-0 block">
                            <span className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-sm truncate">
                                {titleFor(channel)}
                              </span>
                              <span className="text-[10px] text-base-content/50 shrink-0">
                                {formatTimestamp(last?.created_at)}
                              </span>
                            </span>
                            <span className="block text-xs text-base-content/60 truncate mt-0.5">
                              {last?.text || "No messages yet"}
                            </span>
                          </span>

                          {unread > 0 && (
                            <span className="badge badge-primary badge-sm shrink-0">
                              {unread > 9 ? "9+" : unread}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
        )}
      </div>
    </div>
  );
};

export default ChatList;
