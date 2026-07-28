import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, DoorOpen, Plus, Timer } from "lucide-react";

import useAuthUser from "../hooks/useAuthUser";
import useActiveSession from "../hooks/useActiveSession";
import { getMyRooms, getMyTeams, getUserSessions } from "../lib/api";
import SessionContributionGrid from "../components/SessionContributionGrid";
import ActiveSessionCard from "../components/ActiveSessionCard";
import LiveNow from "../components/LiveNow";

const dayKey = (d) =>
  [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");

const HomePage = () => {
  const { authUser } = useAuthUser();
  const { session: activeSession, isActive, onBreak } = useActiveSession();

  const firstName = authUser?.fullName?.split(" ")[0] || "there";

  const { data: rooms = [] } = useQuery({
    queryKey: ["myRooms"],
    queryFn: getMyRooms,
    enabled: !!authUser,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["teams"],
    queryFn: getMyTeams,
    enabled: !!authUser,
  });

  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ["mySessions", authUser?._id],
    queryFn: () => getUserSessions(authUser._id),
    enabled: !!authUser,
  });

  const isNewUser = !loadingSessions && sessions.length === 0;

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = sessions.filter(
    (s) => !s.abandoned && new Date(s.startTime) >= weekAgo
  );
  const weekMinutes = thisWeek.reduce((a, s) => a + (s.actualDuration || 0), 0);

  const days = new Set(
    sessions
      .filter((s) => !s.abandoned)
      .map((s) => dayKey(new Date(s.startTime || s.createdAt)))
  );
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const key = dayKey(new Date(Date.now() - i * 86400000));
    if (days.has(key)) streak++;
    else if (i > 0) break;
  }

  const stats = [
    {
      label: "This week",
      value: `${Math.floor(weekMinutes / 60)}h ${weekMinutes % 60}m`,
    },
    { label: "Sessions", value: thisWeek.length },
    { label: "Day streak", value: streak },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="container mx-auto max-w-6xl">
        {/* ---- what you're doing, or the way to start ---- */}
        {isActive ? (
          <div className="mb-8">
            <ActiveSessionCard session={activeSession} onBreak={onBreak} />
          </div>
        ) : (
          <header className="pb-6 mb-8 border-b border-base-300">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl lg:text-[2.5rem] font-bold tracking-tight leading-tight">
                  {isNewUser ? `Welcome, ${firstName}` : "Ready when you are"}
                </h1>
                <p className="text-sm sm:text-base text-base-content/60 mt-1.5 max-w-lg">
                  {isNewUser
                    ? "Say what you're working on, set a clock, and go. No room required."
                    : "Take a desk on your own, or drop into a room where people are already working."}
                </p>
                <div className="flex flex-wrap gap-2 mt-5">
                  <Link to="/focus" className="btn btn-primary gap-2">
                    <Timer className="size-4" />
                    Take a desk
                  </Link>
                  <Link to="/rooms" className="btn btn-ghost gap-2">
                    <DoorOpen className="size-4" />
                    Browse rooms
                  </Link>
                </div>
              </div>

              {!isNewUser && (
                <dl className="flex gap-6 sm:gap-8 shrink-0">
                  {stats.map((stat) => (
                    <div key={stat.label}>
                      <dt className="text-[11px] uppercase tracking-wide text-base-content/50">
                        {stat.label}
                      </dt>
                      <dd className="text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight mt-0.5">
                        {stat.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </header>
        )}

        {/* ---- your own record, then the room around you ---- */}
        {!isNewUser && (
          <div className="mb-10">
            <SessionContributionGrid />
          </div>
        )}

        <LiveNow />

        {/* ---- where you work, weighted toward rooms ---- */}
        <div className="grid lg:grid-cols-[1.6fr_1fr] gap-8 lg:gap-12 mt-10">
          <section className="min-w-0">
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <h2 className="font-semibold">Your rooms</h2>
              <Link
                to="/rooms"
                className="text-xs text-base-content/60 hover:text-primary transition-colors"
              >
                All rooms
              </Link>
            </div>

            {rooms.length === 0 ? (
              <p className="text-sm text-base-content/60 py-4 border-t border-base-300">
                You haven&apos;t joined a room yet.{" "}
                <Link to="/rooms" className="link link-primary">
                  Find one
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y divide-base-300 border-t border-base-300">
                {rooms.slice(0, 5).map((room) => (
                  <li key={room._id}>
                    <Link
                      to={`/rooms/${room._id}`}
                      className="group flex items-center gap-3 py-3 -mx-2 px-2 rounded-field hover:bg-base-200 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">
                          {room.name}
                        </p>
                        <p className="text-xs text-base-content/55 truncate mt-0.5">
                          {room.team?.name ?? "Open to anyone"} ·{" "}
                          {room.members?.length ?? 0}{" "}
                          {room.members?.length === 1 ? "member" : "members"}
                        </p>
                      </div>
                      {room.activeStreams?.length > 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-success font-medium shrink-0">
                          <span className="size-1.5 rounded-full bg-success" />
                          {room.activeStreams.length} at{" "}
                          {room.activeStreams.length === 1
                            ? "a desk"
                            : "desks"}
                        </span>
                      ) : (
                        <ArrowRight className="size-4 text-base-content/25 group-hover:text-base-content/50 transition-colors shrink-0" />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="min-w-0">
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <h2 className="font-semibold">Your teams</h2>
              <Link
                to="/teams"
                className="text-xs text-base-content/60 hover:text-primary transition-colors"
              >
                All teams
              </Link>
            </div>

            {teams.length === 0 ? (
              <div className="border-t border-base-300 pt-4">
                <p className="text-sm text-base-content/60">
                  Bring your company or study group in. Invited members join
                  free.
                </p>
                <Link
                  to="/teams"
                  className="btn btn-sm btn-outline gap-1.5 mt-3"
                >
                  <Plus className="size-3.5" />
                  Set up a team
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-base-300 border-t border-base-300">
                {teams.slice(0, 5).map((team) => (
                  <li key={team._id}>
                    <Link
                      to={`/teams/${team._id}`}
                      className="flex items-center gap-3 py-3 -mx-2 px-2 rounded-field hover:bg-base-200 transition-colors"
                    >
                      <Building2 className="size-4 text-base-content/40 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">
                          {team.name}
                        </p>
                        <p className="text-xs text-base-content/55 truncate mt-0.5">
                          {team.members?.length ?? 0}{" "}
                          {team.members?.length === 1 ? "member" : "members"} ·{" "}
                          {team.roomCount}{" "}
                          {team.roomCount === 1 ? "room" : "rooms"}
                        </p>
                      </div>
                      <span className="text-[11px] uppercase tracking-wide text-base-content/45 shrink-0">
                        {team.myRole}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

      </div>
    </div>
  );
};

export default HomePage;
