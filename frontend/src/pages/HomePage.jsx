import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Rocket,
  Users,
  Shapes,
  MessageSquare,
  Bell,
} from "lucide-react";

import useAuthUser from "../hooks/useAuthUser";
import { useNotificationUnreadCount } from "../hooks/useNotificationUnreadCount";
import { getMySpaces, getUserFriends, getUserSessions } from "../lib/api";
import SessionContributionGrid from "../components/SessionContributionGrid";
import FriendsActivity from "../components/FriendsActivity";
import TopSpaces from "../components/TopSpaces";


const HomePage = () => {
  const { authUser } = useAuthUser();
  const unreadCount = useNotificationUnreadCount();

  const firstName = authUser?.fullName?.split(" ")[0] || "Grinder";

  const { data: friends = [], isLoading: loadingFriends } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
    enabled: !!authUser,
  });

  const { data: mySpaces = [], isLoading: loadingSpaces } = useQuery({
    queryKey: ["mySpaces"],
    queryFn: getMySpaces,
    enabled: !!authUser,
  });

  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ["mySessions", authUser?._id],
    queryFn: () => getUserSessions(authUser._id),
    enabled: !!authUser,
  });

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="container mx-auto space-y-6 sm:space-y-8">
        {/* Hero */}
        <div className="card overflow-hidden border border-base-300 bg-linear-to-r from-primary/10 via-secondary/10 to-accent/10">
          <div className="card-body p-5 sm:p-7 md:p-8 lg:p-10">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 lg:gap-8">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-primary font-medium text-xs sm:text-sm">
                  Welcome back
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
                  Ready to grind, {firstName}?
                </h1>
                <p className="text-sm sm:text-base text-base-content/70 max-w-2xl">
                  Join a space, connect with partners, and keep your focus
                  streak alive.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full lg:w-auto">
                <Link to="/spaces" className="btn btn-primary">
                  <Rocket className="size-4 mr-2" /> Start grinding
                </Link>
                <Link to="/notifications" className="btn btn-ghost">
                  <Bell className="size-4 mr-2" /> Notifications
                  {unreadCount > 0 && (
                    <span className="badge badge-error badge-sm ml-2">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="card bg-base-200">
            <div className="card-body p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-base-content/60">
                    Friends
                  </p>
                  <p className="text-xl sm:text-2xl font-bold">
                    {loadingFriends ? (
                      <span className="loading loading-dots loading-sm" />
                    ) : (
                      friends.length
                    )}
                  </p>
                </div>
                <Users className="size-6 sm:size-7 opacity-70" />
              </div>
            </div>
          </div>
          <div className="card bg-base-200">
            <div className="card-body p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-base-content/60">
                    My Spaces
                  </p>
                  <p className="text-xl sm:text-2xl font-bold">
                    {loadingSpaces ? (
                      <span className="loading loading-dots loading-sm" />
                    ) : (
                      mySpaces.length
                    )}
                  </p>
                </div>
                <Shapes className="size-6 sm:size-7 opacity-70" />
              </div>
            </div>
          </div>
          <div className="card bg-base-200">
            <div className="card-body p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-base-content/60">
                    Sessions
                  </p>
                  <p className="text-xl sm:text-2xl font-bold">
                    {loadingSessions ? (
                      <span className="loading loading-dots loading-sm" />
                    ) : (
                      sessions?.length || 0
                    )}
                  </p>
                </div>
                <Rocket className="size-6 sm:size-7 opacity-70" />
              </div>
            </div>
          </div>
          <div className="card bg-base-200">
            <div className="card-body p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-base-content/60">
                    Unread Alerts
                  </p>
                  <p className="text-xl sm:text-2xl font-bold">{unreadCount}</p>
                </div>
                <Bell className="size-6 sm:size-7 opacity-70" />
              </div>
            </div>
          </div>
  </div>

  {/* Quick actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Link
            to="/spaces"
            className="card hover:shadow-lg transition-all bg-base-200"
          >
            <div className="card-body p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="btn btn-circle btn-sm btn-primary text-primary-content">
                  <Shapes className="size-4" />
                </div>
                <div>
                  <p className="font-semibold text-sm sm:text-base">
                    Explore Spaces
                  </p>
                  <p className="text-[11px] sm:text-xs text-base-content/60">
                    Find a group to focus with
                  </p>
                </div>
              </div>
            </div>
          </Link>
          <Link
            to="/friends"
            className="card hover:shadow-lg transition-all bg-base-200"
          >
            <div className="card-body p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="btn btn-circle btn-sm btn-secondary text-secondary-content">
                  <Users className="size-4" />
                </div>
                <div>
                  <p className="font-semibold text-sm sm:text-base">
                    Find Friends
                  </p>
                  <p className="text-[11px] sm:text-xs text-base-content/60">
                    Match with partners
                  </p>
                </div>
              </div>
            </div>
          </Link>
          <Link
            to="/chats"
            className="card hover:shadow-lg transition-all bg-base-200"
          >
            <div className="card-body p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="btn btn-circle btn-sm btn-accent text-accent-content">
                  <MessageSquare className="size-4" />
                </div>
                <div>
                  <p className="font-semibold text-sm sm:text-base">
                    Open Chats
                  </p>
                  <p className="text-[11px] sm:text-xs text-base-content/60">
                    Catch up with friends
                  </p>
                </div>
              </div>
            </div>
          </Link>
          <Link
            to="/notifications"
            className="card hover:shadow-lg transition-all bg-base-200"
          >
            <div className="card-body p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="btn btn-circle btn-sm">
                  <Bell className="size-4" />
                </div>
                <div>
                  <p className="font-semibold text-sm sm:text-base">
                    View Alerts
                  </p>
                  <p className="text-[11px] sm:text-xs text-base-content/60">
                    Never miss an update
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Session Activity Grid */}
        <SessionContributionGrid />

        {/* Friends Activity */}
        <FriendsActivity />

        {/* Global Top Spaces */}
        <TopSpaces />
      </div>

      
    </div>
  );
};

export default HomePage;
