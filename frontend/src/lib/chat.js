/**
 * Which surface a Stream channel belongs to.
 *
 * Group channels carry `kendroKind` from the server sync; anything on the
 * `messaging` type is a direct message between two people.
 */
export const channelKind = (channel) => {
  if (channel.type !== "team") return "dm";
  return channel.data?.kendroKind === "team" ? "team" : "room";
};
