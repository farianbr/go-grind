import { useEffect, useState } from "react";
import { StreamChat } from "stream-chat";
import { useQuery } from "@tanstack/react-query";
import useAuthUser from "./useAuthUser";
import { getStreamToken } from "../lib/api";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

export const useChatUnreadCount = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { authUser } = useAuthUser();

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser,
  });

  useEffect(() => {
    let client = null;

    const initAndGetUnread = async () => {
      if (!tokenData?.token || !authUser) return;

      try {
        client = StreamChat.getInstance(STREAM_API_KEY);

        // Check if already connected
        if (!client.userID) {
          await client.connectUser(
            {
              id: authUser._id,
              name: authUser.fullName,
              image: authUser.profilePic,
            },
            tokenData.token
          );
        }

        // Get unread count
        const filter = {
          type: "messaging",
          members: { $in: [client.userID] },
        };

        const channels = await client.queryChannels(filter, {}, {
          state: true,
        });

        const totalUnread = channels.reduce((acc, channel) => {
          return acc + (channel.countUnread() || 0);
        }, 0);

        setUnreadCount(totalUnread);

        // Listen for new messages
        const handleNewMessage = () => {
          // Refetch unread count
          client.queryChannels(filter, {}, { state: true }).then((channels) => {
            const totalUnread = channels.reduce((acc, channel) => {
              return acc + (channel.countUnread() || 0);
            }, 0);
            setUnreadCount(totalUnread);
          });
        };

        client.on("message.new", handleNewMessage);
        client.on("message.read", handleNewMessage);

        return () => {
          client.off("message.new", handleNewMessage);
          client.off("message.read", handleNewMessage);
        };
      } catch {
        // Ignore errors in getting unread count
      }
    };

    initAndGetUnread();
  }, [authUser, tokenData?.token]);

  return unreadCount;
};
