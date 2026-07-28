import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyRooms, getUserFriends, getUserSessions } from "../lib/api";
import { Video, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router";

const FriendsActivity = () => {
  const { data: friends = [] } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
  });
  const { data: myRooms = [] } = useQuery({
    queryKey: ["myRooms"],
    queryFn: getMyRooms,
  });
  const [visibleCount, setVisibleCount] = useState(5);

  const friendIds = useMemo(
    () => new Set(friends.map((f) => f._id)),
    [friends]
  );

  const streamingFriends = useMemo(() => {
    const list = [];
    myRooms.forEach((room) => {
      room.activeStreams?.forEach((s) => {
        const uid = s.user?._id || s.user;
        if (friendIds.has(uid)) {
          const friend = friends.find((f) => f._id === uid);
          list.push({
            room,
            stream: s,
            friend: friend || s.user,
          });
        }
      });
    });
    return list;
  }, [myRooms, friendIds, friends]);

  const { data: allFriendSessions = [] } = useQuery({
    queryKey: ["friendSessions", friends.map((f) => f._id).join(",")],
    queryFn: async () => {
      if (friends.length === 0) return [];
      const allSessions = await Promise.all(
        friends.map((friend) => getUserSessions(friend._id).catch(() => []))
      );
      return allSessions
        .flat()
        .filter((s) => s.isCompleted && s.actualDuration)
        .sort(
          (a, b) =>
            new Date(b.endTime || b.updatedAt) -
            new Date(a.endTime || a.updatedAt)
        );
    },
    enabled: friends.length > 0,
  });

  const visibleSessions = allFriendSessions.slice(0, visibleCount);
  const hasMore = visibleCount < allFriendSessions.length;

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} minute${mins !== 1 ? "s" : ""}`;
    if (mins === 0) return `${hours} hour${hours !== 1 ? "s" : ""}`;
    return `${hours} hour${hours !== 1 ? "s" : ""} ${mins} minute${
      mins !== 1 ? "s" : ""
    }`;
  };

  return (
    <div className="space-y-4">
      <div className="card bg-base-200">
        <div className="card-body p-4 sm:p-5">
          <h3 className="font-semibold mb-3">Friends Streaming Now</h3>
          {streamingFriends.length === 0 ? (
            <div className="text-sm bg-base-200 text-center text-base-content/60 h-20">
              No friends are working right now.
            </div>
          ) : (
            <div className="space-y-2">
              {streamingFriends.map(({ room, stream, friend }) => (
                <div
                  key={`${room._id}-${stream.user?._id || stream.user}`}
                  className="flex items-center gap-3 p-2 rounded-lg bg-base-300/50"
                >
                  <div className="avatar avatar-online">
                    <div className="w-8 h-8 rounded-full overflow-hidden">
                      <img
                        src={
                          friend?.profilePic ||
                          stream.user?.profilePic ||
                          "/blank-pp.png"
                        }
                        alt={
                          friend?.fullName || stream.user?.fullName || "Friend"
                        }
                      />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {friend?.fullName || stream.user?.fullName || "Friend"}
                    </p>
                    <p className="text-xs text-base-content/60 truncate">
                      {room.name}
                    </p>
                  </div>
                  <Link
                    to={`/rooms/${room._id}/stream`}
                    className="btn btn-primary btn-xs"
                  >
                    <Video className="size-3 mr-1" /> Join
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card bg-base-200">
        <div className="card-body p-4 sm:p-5">
          <h3 className="font-semibold mb-3">Recent Friends Activity</h3>
          {allFriendSessions.length === 0 ? (
            <div className="text-sm text-base-content/60">
              No recent completed sessions from friends.
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {visibleSessions.map((session) => {
                  const friend = friends.find(
                    (f) => f._id === session.user?._id
                  );
                  return (
                    <div
                      key={session._id}
                      className="card bg-base-300/50 border border-base-300"
                    >
                      <div className="card-body p-3 sm:p-4">
                        <div className="flex items-start gap-3">
                          <Link
                            to={`/profile/${session.user?._id}`}
                            className="avatar"
                          >
                            <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-base-300">
                              <img
                                src={
                                  session.user?.profilePic ||
                                  friend?.profilePic ||
                                  "/blank-pp.png"
                                }
                                alt={session.user?.fullName || "Friend"}
                              />
                            </div>
                          </Link>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">
                              <Link
                                to={`/profile/${session.user?._id}`}
                                className="hover:text-primary"
                              >
                                {session.user?.fullName || "Friend"}
                              </Link>{" "}
                              completed a{" "}
                              <span className="text-success font-semibold">
                                {formatDuration(session.actualDuration)}
                              </span>{" "}
                              session
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="badge badge-sm badge-outline">
                                {session.workTopic}
                              </span>
                              {session.room?.name && (
                                <span className="badge badge-sm badge-ghost">
                                  <Link
                                    to={`/rooms/${session.room._id}`}
                                    className="hover:text-primary"
                                  >
                                    {session.room.name}
                                  </Link>
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-base-content/60 mt-1 flex items-center gap-1">
                              <Clock className="size-3" />
                              {formatDistanceToNow(
                                new Date(session.endTime || session.updatedAt),
                                { addSuffix: true }
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {hasMore && (
                <button
                  onClick={() => setVisibleCount((prev) => prev + 5)}
                  className="btn btn-ghost w-fit mx-auto sm:px-6 btn-sm mt-3"
                >
                  Show More
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendsActivity;
