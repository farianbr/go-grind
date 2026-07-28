import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Coffee, Users } from "lucide-react";

import { getLivePresence } from "../lib/api";

const pad = (n) => String(n).padStart(2, "0");

function workedSeconds(session, now) {
  const breaks = (session.breaks || []).reduce((total, b) => {
    if (!b.startedAt) return total;
    const end = b.endedAt ? new Date(b.endedAt) : now;
    return total + Math.max(0, end - new Date(b.startedAt));
  }, 0);
  return Math.max(0, (now - new Date(session.startTime) - breaks) / 1000);
}

/**
 * Who else is working right now, across your teams, rooms and friends.
 *
 * Sits below your own record on the dashboard: you check your streak first and
 * the room second, and an empty presence list is a poor thing to open on.
 */
const LiveNow = () => {
  const [now, setNow] = useState(() => Date.now());

  const { data: live = [], isLoading } = useQuery({
    queryKey: ["livePresence"],
    queryFn: getLivePresence,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <section>
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-semibold inline-flex items-center gap-2">
            {live.length > 0 && (
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
            )}
            At their desks
          </h2>
          {live.length > 0 && (
            <span className="text-xs text-base-content/55 font-mono tabular-nums">
              {live.length} working now
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex gap-2 border-t border-base-300 pt-4">
            <span className="loading loading-dots loading-sm" />
          </div>
        ) : live.length === 0 ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 border-t border-base-300 pt-4">
            <p className="text-sm text-base-content/60 flex-1">
              Nobody you work with is at a desk right now. Bring your team in
              and this fills up on its own.
            </p>
            <Link to="/teams" className="btn btn-sm btn-outline gap-1.5 shrink-0">
              <Users className="size-3.5" />
              Your teams
            </Link>
          </div>
        ) : (
          <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-1 border-t border-base-300 pt-2">
            {live.map((s) => {
              const onBreak = s.breaks?.some((b) => !b.endedAt);
              const secs = workedSeconds(s, new Date(now));
              const clock = `${pad(Math.floor(secs / 60))}:${pad(
                Math.floor(secs % 60)
              )}`;
              return (
                <li key={s._id} className="flex items-center gap-3 py-2.5">
                  <Link to={`/profile/${s.user?._id}`} className="shrink-0">
                    <img
                      src={s.user?.profilePic || "/blank-pp.png"}
                      alt=""
                      className={`size-10 rounded-full object-cover ring-2 ring-offset-2 ring-offset-base-100 ${
                        onBreak ? "ring-warning/60" : "ring-success/70"
                      }`}
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {s.user?.fullName}
                    </p>
                    <p className="text-xs text-base-content/60 truncate">
                      {s.workTopic}
                    </p>
                    {(s.room?.name || s.via) && (
                      <p className="text-[11px] text-base-content/40 truncate mt-0.5">
                        {s.room?.name ?? s.via}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-xs font-mono tabular-nums shrink-0 ${
                      onBreak ? "text-warning" : "text-base-content/55"
                    }`}
                    title={onBreak ? "On a break" : "Working"}
                  >
                    {onBreak ? <Coffee className="size-4" /> : clock}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};

export default LiveNow;
