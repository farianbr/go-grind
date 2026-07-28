import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { Building2, MessagesSquare, UserRoundPlus } from "lucide-react";

import {
  getRecommendedUsers,
  getUserFriends,
  getFriendRequests,
  getMyTeams,
} from "../lib/api";
import useAuthUser from "../hooks/useAuthUser";
import { capitalize } from "../lib/utils";
import FriendCard from "../components/FriendCard";
import NoFriendsFound from "../components/NoFriendsFound";
import RecommendedFriends from "../components/RecommendedFriends";
import FriendRequestsPanel from "../components/FriendRequestsPanel";

/**
 * People, not just friends. In a co-working product the person you most need
 * to reach is usually a teammate you never sent a friend request to, so they
 * lead here and the social graph sits behind them.
 */
const FriendsPage = () => {
  const { authUser } = useAuthUser();
  const [tabOverride, setTabOverride] = useState(null);

  const { data: teams = [], isLoading: loadingTeams } = useQuery({
    queryKey: ["teams"],
    queryFn: getMyTeams,
  });

  const { data: friends = [], isLoading: loadingFriends } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
  });

  const { data: recommendedUsers = [], isLoading: loadingRecommended } =
    useQuery({
      queryKey: ["users"],
      queryFn: getRecommendedUsers,
    });

  const { data: friendRequestsData } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: getFriendRequests,
  });

  const incomingRequestsCount =
    friendRequestsData?.incomingRequests?.length || 0;

  // One row per person, carrying every team you share with them.
  const teammates = [];
  const byId = new Map();
  for (const team of teams) {
    for (const member of team.members || []) {
      const user = member.user;
      if (!user?._id || user._id === authUser?._id) continue;
      if (byId.has(user._id)) {
        byId.get(user._id).teams.push(team.name);
      } else {
        const entry = { user, teams: [team.name], teamRole: member.role };
        byId.set(user._id, entry);
        teammates.push(entry);
      }
    }
  }

  const activeTab =
    tabOverride ?? (teammates.length > 0 ? "teammates" : "friends");

  const tabs = [
    { key: "teammates", label: "Teammates", count: teammates.length },
    { key: "friends", label: "Friends", count: friends.length },
    {
      key: "discover",
      label: "Discover",
      count: loadingRecommended ? null : recommendedUsers.length,
    },
    { key: "requests", label: "Requests", count: incomingRequestsCount },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-6xl space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
            People
          </h1>
          <p className="text-sm text-base-content/60 mt-1">
            Everyone you share a team, a room or a desk with
          </p>
        </div>

        <div className="tabs tabs-box bg-base-200 p-1 inline-flex flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`tab tab-sm sm:tab-md ${
                activeTab === tab.key ? "tab-active" : ""
              }`}
              onClick={() => setTabOverride(tab.key)}
            >
              {tab.label}
              <span className="badge badge-sm ml-1.5">
                {tab.count === null ? "…" : tab.count}
              </span>
            </button>
          ))}
        </div>

        {activeTab === "teammates" && (
          <div>
            {loadingTeams ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="skeleton h-24 w-full" />
                ))}
              </div>
            ) : teammates.length === 0 ? (
              <div className="card bg-base-200 border border-base-300">
                <div className="card-body p-6 sm:p-8 items-center text-center gap-2">
                  <Building2 className="size-10 text-base-content/30" />
                  <h2 className="font-semibold">No teammates yet</h2>
                  <p className="text-sm text-base-content/60 max-w-sm">
                    Bring your company or study group in and everyone you invite
                    shows up here. Joining a team is free.
                  </p>
                  <Link to="/teams" className="btn btn-primary btn-sm mt-2">
                    Go to teams
                  </Link>
                </div>
              </div>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {teammates.map(({ user, teams: shared, teamRole }) => (
                  <li
                    key={user._id}
                    className="card bg-base-200 border border-base-300"
                  >
                    <div className="card-body p-4 gap-3">
                      <div className="flex items-center gap-3">
                        <Link to={`/profile/${user._id}`} className="shrink-0">
                          <img
                            src={user.profilePic || "/blank-pp.png"}
                            alt=""
                            className="size-11 rounded-full object-cover"
                          />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/profile/${user._id}`}
                            className="font-semibold text-sm truncate block hover:text-primary transition-colors"
                          >
                            {user.fullName}
                          </Link>
                          {user.role && (
                            <p className="text-xs text-base-content/60 truncate">
                              {capitalize(user.role)}
                            </p>
                          )}
                        </div>
                        {teamRole !== "member" && (
                          <span className="badge badge-ghost badge-sm capitalize shrink-0">
                            {teamRole}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-base-content/60 truncate inline-flex items-center gap-1.5">
                        <Building2 className="size-3.5 shrink-0" />
                        {shared.join(", ")}
                      </p>

                      <div className="flex gap-2">
                        <Link
                          to={`/chats/${user._id}`}
                          className="btn btn-sm btn-outline flex-1 gap-1.5"
                        >
                          <MessagesSquare className="size-3.5" />
                          Message
                        </Link>
                        <Link
                          to={`/profile/${user._id}`}
                          className="btn btn-sm btn-ghost"
                        >
                          Profile
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === "friends" && (
          <div>
            {loadingFriends ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="skeleton h-40 w-full" />
                ))}
              </div>
            ) : friends.length === 0 ? (
              <NoFriendsFound />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
                {friends.map((friend) => (
                  <FriendCard
                    key={friend._id}
                    friend={friend}
                    showUnfriend={false}
                    showViewProfile
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "discover" && (
          <div className="space-y-4">
            <p className="text-sm text-base-content/60 inline-flex items-center gap-1.5">
              <UserRoundPlus className="size-4" />
              People working on things near yours
            </p>
            <RecommendedFriends />
          </div>
        )}

        {activeTab === "requests" && <FriendRequestsPanel />}
      </div>
    </div>
  );
};

export default FriendsPage;
