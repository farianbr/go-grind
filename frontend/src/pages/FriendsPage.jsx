import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { UsersIcon } from "lucide-react";

import { getRecommendedUsers, getUserFriends, getFriendRequests } from "../lib/api";
import FriendCard from "../components/FriendCard";
import NoFriendsFound from "../components/NoFriendsFound";
import RecommendedFriends from "../components/RecommendedFriends";
import FriendRequestsPanel from "../components/FriendRequestsPanel";
import { Link } from "react-router";

const FriendsPage = () => {
  const [activeTab, setActiveTab] = useState("my-friends");

  const { data: friends = [], isLoading: loadingFriends } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
  });

  // Just for count badge on Discover tab
  const { data: recommendedUsers = [], isLoading: loadingRecommended } = useQuery({
    queryKey: ["users"],
    queryFn: getRecommendedUsers,
  });

  // Incoming requests count for badge
  const { data: friendRequestsData } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: getFriendRequests,
  });

  const incomingRequestsCount = friendRequestsData?.incomingRequests?.length || 0;

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="container mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Friends</h2>
            <p className="text-sm text-base-content/60 mt-1">Connect and collaborate with your grind buddies</p>
          </div>
          
        </div>

        {/* Tabs */}
        <div className="tabs tabs-box bg-base-200 p-1 w-full sm:w-auto inline-flex">
          <button
            className={`tab tab-sm sm:tab-md ${activeTab === "my-friends" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("my-friends")}
          >
            My Friends
            <span className="badge badge-sm ml-1.5 sm:ml-2">{friends.length}</span>
          </button>
          <button
            className={`tab tab-sm sm:tab-md ${activeTab === "find" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("find")}
          >
            Find Friends
            <span className="badge badge-sm ml-1.5 sm:ml-2">{loadingRecommended ? "…" : recommendedUsers.length}</span>
          </button>
          <button
            className={`tab tab-sm sm:tab-md ${activeTab === "requests" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("requests")}
          >
            Requests
            <span className="badge badge-sm ml-1.5 sm:ml-2">{incomingRequestsCount}</span>
          </button>
        </div>

        {/* My Friends Tab */}
        {activeTab === "my-friends" && (
          <div className="space-y-4">
            {loadingFriends ? (
              <div className="flex justify-center py-8 sm:py-12">
                <span className="loading loading-spinner loading-md sm:loading-lg" />
              </div>
            ) : friends.length === 0 ? (
              <NoFriendsFound />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
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

        {/* Discover Tab */}
        {activeTab === "find" && (
          <div className="space-y-4">
            <RecommendedFriends />
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === "requests" && (
          <div className="space-y-4">
            <FriendRequestsPanel />
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsPage;
