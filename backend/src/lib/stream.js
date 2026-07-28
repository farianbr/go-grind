import { StreamChat } from "stream-chat";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

if (!apiKey || !apiSecret) {
  console.error("Stream API key or secret is missing");
}

const streamClient = StreamChat.getInstance(apiKey, apiSecret);

export const upsertStreamUser = async (userData) => {
  try {
    await streamClient.upsertUsers([userData]);
    return userData;
  } catch (error) {
    console.error("Error upserting stream user", error);
  }
};

export const generateStreamToken = (userId) => {
  try {
    const userIdStr = userId.toString();
    return streamClient.createToken(userIdStr);
  } catch (error) {
    console.error("Error generating Stream token:", error);
  }
};

/**
 * Channel ids for the two group surfaces. Deriving them from the Mongo id
 * rather than storing a second identifier means a room and its channel can
 * never point at different things.
 */
export const roomChannelId = (roomId) => `room-${roomId}`;
export const teamChannelId = (teamId) => `team-${teamId}`;

/**
 * Reconcile one user's group channels against the database.
 *
 * Rooms and teams are the source of truth; this brings Stream in line with
 * them. It is written as a reconcile rather than as hooks on join/leave/delete
 * because there are eight mutation sites and any one of them silently failing
 * would leave a member stranded in a channel for a room they had left. Running
 * the whole diff on demand is idempotent, self-healing for rooms that predate
 * chat, and cheap enough to call whenever the chat surface opens.
 */
export const syncUserChannels = async ({ userId, rooms, teams }) => {
  if (!apiKey || !apiSecret) return { synced: 0, removed: 0 };

  const uid = String(userId);

  const desired = [
    ...rooms.map((room) => ({
      id: roomChannelId(room._id),
      name: room.name,
      kind: "room",
      subjectId: String(room._id),
    })),
    ...teams.map((team) => ({
      id: teamChannelId(team._id),
      name: team.name,
      kind: "team",
      subjectId: String(team._id),
    })),
  ];

  await Promise.all(
    desired.map(async (spec) => {
      try {
        const channel = streamClient.channel("team", spec.id, {
          created_by_id: uid,
        });
        // `create` is idempotent for an existing id, so one call covers both
        // the first open and every one after it.
        await channel.create();
        await channel.updatePartial({
          set: {
            name: spec.name,
            kendroKind: spec.kind,
            kendroSubjectId: spec.subjectId,
          },
        });
        if (!channel.state.members?.[uid]) {
          await channel.addMembers([uid]);
        }
      } catch (error) {
        console.error(`Stream channel sync failed for ${spec.id}:`, error.message);
      }
    })
  );

  // Anything they are still a member of but no longer belong to gets dropped,
  // so leaving a room actually removes its conversation from their list.
  let removed = 0;
  try {
    const keep = new Set(desired.map((spec) => spec.id));
    const existing = await streamClient.queryChannels(
      { type: "team", members: { $in: [uid] } },
      { last_message_at: -1 },
      { limit: 100 }
    );

    await Promise.all(
      existing
        .filter((channel) => !keep.has(channel.id))
        .map(async (channel) => {
          try {
            await channel.removeMembers([uid]);
            removed += 1;
          } catch (error) {
            console.error(
              `Stream channel prune failed for ${channel.id}:`,
              error.message
            );
          }
        })
    );
  } catch (error) {
    console.error("Stream channel prune query failed:", error.message);
  }

  return { synced: desired.length, removed };
};

/**
 * Drop a group channel outright. Used when the room or team itself is deleted,
 * where pruning per-member would leave an orphaned conversation behind.
 */
export const deleteGroupChannel = async (channelId) => {
  if (!apiKey || !apiSecret) return;
  try {
    await streamClient.channel("team", channelId).delete();
  } catch (error) {
    // A channel that was never created is not an error worth surfacing.
    if (!/not exist/i.test(error.message || "")) {
      console.error(`Stream channel delete failed for ${channelId}:`, error.message);
    }
  }
};
