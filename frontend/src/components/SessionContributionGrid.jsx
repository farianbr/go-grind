import { useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUserSessions } from "../lib/api";
import useAuthUser from "../hooks/useAuthUser";

// Bucket by the viewer's local calendar day. toISOString() is UTC, so a session
// finished at 11pm local time was filed under the next day and silently broke
// the streak this component exists to reward.
const dateKey = (d) =>
  [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");

const SessionContributionGrid = () => {
  const { authUser } = useAuthUser();
  const scrollContainerRef = useRef(null);

  const { data: sessions = [] } = useQuery({
    queryKey: ["mySessions", authUser?._id],
    queryFn: () => getUserSessions(authUser._id),
    enabled: !!authUser,
  });

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft =
        scrollContainerRef.current.scrollWidth;
    }
  }, [sessions]);

  const contributionData = useMemo(() => {
    const days = [];
    const today = new Date();
    const sessionMap = new Map();

    sessions.forEach((s) => {
      const date = new Date(s.startTime || s.createdAt);
      const key = dateKey(date);
      const duration = s.actualDuration || 0;
      sessionMap.set(key, (sessionMap.get(key) || 0) + duration);
    });

    for (let i = 364; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const key = dateKey(date);
      const minutes = sessionMap.get(key) || 0;
      days.push({
        date: key,
        minutes,
        day: date.getDay(),
        label: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      });
    }

    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return weeks;
  }, [sessions]);

  const getIntensityClass = (minutes) => {
    if (minutes === 0) return "bg-base-300/90";
    if (minutes < 30) return "bg-success/30";
    if (minutes < 60) return "bg-success/50";
    if (minutes < 120) return "bg-success/70";
    return "bg-success";
  };

  const formatDuration = (minutes) => {
    if (minutes === 0) return "No sessions";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m of work`;
    if (mins === 0) return `${hours}h of work`;
    return `${hours}h ${mins}m of work`;
  };

  // Abandoned sessions carry an estimated duration, not an observed one. Keep
  // them out of the headline total so a dropped connection can't inflate it.
  const totalMinutes = sessions.reduce(
    (sum, s) => sum + (s.abandoned ? 0 : s.actualDuration || 0),
    0
  );
  const totalHours = Math.floor(totalMinutes / 60);

  const streakData = useMemo(() => {
    if (sessions.length === 0)
      return { currentStreak: 0, longestStreak: 0, lastStreamDate: null };

    const sessionDates = new Set();
    sessions.forEach((s) => {
      const date = new Date(s.startTime || s.createdAt);
      sessionDates.add(dateKey(date));
    });

    const sortedDates = Array.from(sessionDates).sort().reverse();
    const today = dateKey(new Date());
    const yesterday = dateKey(new Date(Date.now() - 86400000));

    let currentStreak = 0;
    let checkDate =
      sortedDates[0] === today || sortedDates[0] === yesterday
        ? new Date()
        : null;

    if (checkDate) {
      for (let i = 0; i < 365; i++) {
        const key = dateKey(new Date(checkDate.getTime() - i * 86400000));
        if (sessionDates.has(key)) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    let longestStreak = 0;
    let tempStreak = 1;

    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1]);
      const currDate = new Date(sortedDates[i]);
      const diffDays = Math.round((prevDate - currDate) / 86400000);

      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return {
      currentStreak,
      longestStreak,
      lastStreamDate: sortedDates[0] ? new Date(sortedDates[0]) : null,
    };
  }, [sessions]);

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="font-semibold">Your record</h2>
        <span className="text-xs text-base-content/55 tabular-nums">
          {totalHours}h logged · longest streak {streakData.longestStreak}{" "}
          {streakData.longestStreak === 1 ? "day" : "days"}
        </span>
      </div>

      <div className="border-t border-base-300 pt-4 flex gap-2">
        <div className="flex flex-col gap-0.5 sm:gap-1 text-[9px] sm:text-[10px] text-base-content/50 pr-1 pt-2 shrink-0">
          <div className="h-2 sm:h-3" />
          <div className="h-2 sm:h-3">Mon</div>
          <div className="h-2 sm:h-3" />
          <div className="h-2 sm:h-3">Wed</div>
          <div className="h-2 sm:h-3" />
          <div className="h-2 sm:h-3">Fri</div>
          <div className="h-2 sm:h-3" />
        </div>

        <div
          className="flex-1 min-w-0 overflow-x-auto py-2 pl-1"
          ref={scrollContainerRef}
        >
          <div className="flex gap-0.5 sm:gap-1 w-max">
            {contributionData.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-0.5 sm:gap-1">
                {week.map((day, dayIdx) => (
                  <div
                    key={dayIdx}
                    className={`w-2 h-2 sm:w-3 sm:h-3 rounded-xs sm:rounded-sm ${getIntensityClass(
                      day.minutes
                    )} hover:ring-1 hover:ring-primary transition-all`}
                    title={`${formatDuration(day.minutes)} on ${day.label}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-base-content/50 mt-2">
        <span>Less</span>
        <div className="flex gap-0.5 sm:gap-1">
          {[
            "bg-base-300/90",
            "bg-success/30",
            "bg-success/50",
            "bg-success/70",
            "bg-success",
          ].map((c) => (
            <div
              key={c}
              className={`w-2 h-2 sm:w-3 sm:h-3 rounded-xs sm:rounded-sm ${c}`}
            />
          ))}
        </div>
        <span>More</span>
      </div>
    </section>
  );
};

export default SessionContributionGrid;
