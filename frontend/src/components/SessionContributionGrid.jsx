import { useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUserSessions } from "../lib/api";
import useAuthUser from "../hooks/useAuthUser";

const SessionContributionGrid = () => {
  const { authUser } = useAuthUser();
  const scrollContainerRef = useRef(null);

  const { data: sessions = [] } = useQuery({
    queryKey: ["mySessions", authUser?._id],
    queryFn: () => getUserSessions(authUser._id),
    enabled: !!authUser,
  });

  // Scroll to rightmost on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft =
        scrollContainerRef.current.scrollWidth;
    }
  }, [sessions]);

  // Generate last 1 year of data (365 days ≈ 52 weeks)
  const contributionData = useMemo(() => {
    const days = [];
    const today = new Date();
    const sessionMap = new Map();

    // Build session map by date
    sessions.forEach((s) => {
      const date = new Date(s.startTime || s.createdAt);
      const dateKey = date.toISOString().split("T")[0];
      const duration = s.actualDuration || 0;
      sessionMap.set(dateKey, (sessionMap.get(dateKey) || 0) + duration);
    });

    // Generate 365 days (52 weeks)
    for (let i = 364; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split("T")[0];
      const minutes = sessionMap.get(dateKey) || 0;
      days.push({
        date: dateKey,
        minutes,
        day: date.getDay(),
        label: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      });
    }

    // Group by weeks
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
    if (hours === 0) return `Streamed ${mins}m`;
    if (mins === 0) return `Streamed ${hours}h`;
    return `Streamed ${hours}h ${mins}m`;
  };

  const totalMinutes = sessions.reduce(
    (sum, s) => sum + (s.actualDuration || 0),
    0
  );
  const totalHours = Math.floor(totalMinutes / 60);

  // Calculate streak data
  const streakData = useMemo(() => {
    if (sessions.length === 0)
      return { currentStreak: 0, longestStreak: 0, lastStreamDate: null };

    const sessionDates = new Set();
    sessions.forEach((s) => {
      const date = new Date(s.startTime || s.createdAt);
      sessionDates.add(date.toISOString().split("T")[0]);
    });

    const sortedDates = Array.from(sessionDates).sort().reverse();
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split("T")[0];

    // Calculate current streak
    let currentStreak = 0;
    let checkDate =
      sortedDates[0] === today || sortedDates[0] === yesterday
        ? new Date()
        : null;

    if (checkDate) {
      for (let i = 0; i < 365; i++) {
        const dateKey = new Date(checkDate.getTime() - i * 86400000)
          .toISOString()
          .split("T")[0];
        if (sessionDates.has(dateKey)) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
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
    <div className="grid grid-cols-1 2xl:grid-cols-[1fr_1fr] gap-4">
      {/* Contribution Grid Section */}
      <div className="card bg-base-200 ">
        <div className="card-body p-3 sm:p-4 md:p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
            <h3 className="font-semibold text-sm sm:text-base">
              Your Stream Activity
            </h3>
            <span className="text-[10px] sm:text-xs text-base-content/60">
              {totalHours}h total in the Last year
            </span>
          </div>

          <div className="flex gap-1 sm:gap-2">
            {/* Fixed week labels on the left */}
            <div className="flex flex-col gap-0.5 sm:gap-1 text-[8px] sm:text-[10px] text-base-content/60 pr-1 pt-2 sm:pr-2 sticky left-0 bg-base-200 z-10">
              <div className="h-2 sm:h-3"></div>
              <div className="h-2 sm:h-3">Mon</div>
              <div className="h-2 sm:h-3"></div>
              <div className="h-2 sm:h-3">Wed</div>
              <div className="h-2 sm:h-3"></div>
              <div className="h-2 sm:h-3">Fri</div>
              <div className="h-2 sm:h-3"></div>
            </div>

            {/* Scrollable contribution grid */}
            <div
              className="flex-1 overflow-x-auto py-2 pl-1"
              ref={scrollContainerRef}
            >
              <div className="flex gap-0.5 sm:gap-1">
                {contributionData.map((week, weekIdx) => (
                  <div key={weekIdx} className="flex flex-col gap-0.5 sm:gap-1">
                    {week.map((day, dayIdx) => (
                      <div
                        key={dayIdx}
                        className={`w-2 h-2 sm:w-3 sm:h-3 rounded-xs sm:rounded-sm ${getIntensityClass(
                          day.minutes
                        )} 
                        hover:ring-1 sm:hover:ring-2 hover:ring-primary hover:scale-110 sm:hover:scale-125 
                        transition-all cursor-pointer`}
                        title={`${formatDuration(day.minutes)} on ${day.label}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-base-content/60 mt-2">
            <span>Less</span>
            <div className="flex gap-0.5 sm:gap-1">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-xs sm:rounded-sm bg-base-300/90" />
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-xs sm:rounded-sm bg-success/30" />
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-xs sm:rounded-sm bg-success/50" />
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-xs sm:rounded-sm bg-success/70" />
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-xs sm:rounded-sm bg-success" />
            </div>
            <span>More</span>
          </div>
        </div>
      </div>
      {/* Daily Streak Section */}
      <div className="card bg-base-200">
        <div className="card-body p-3 sm:p-4 md:p-5">
          <h3 className="font-semibold text-sm sm:text-base mb-3">
            Daily Streak
          </h3>

          <div className="flex flex-col sm:flex-row m-auto gap-4">
            {/* Current Streak */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6 sm:w-7 sm:h-7 text-primary"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2c1.5 3 3.5 4.5 6 5 0 4-2 7-6 10-4-3-6-6-6-10 2.5-.5 4.5-2 6-5z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-2xl sm:text-3xl font-bold text-primary">
                  {streakData.currentStreak}
                </div>
                <div className="text-xs sm:text-sm text-base-content/60">
                  Day{streakData.currentStreak !== 1 ? "s" : ""} Current Streak
                </div>
              </div>
            </div>

            {/* Longest Streak */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-warning/10 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6 sm:w-7 sm:h-7 text-warning"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-2xl sm:text-3xl font-bold text-warning">
                  {streakData.longestStreak}
                </div>
                <div className="text-xs sm:text-sm text-base-content/60">
                  Day{streakData.longestStreak !== 1 ? "s" : ""} Longest Streak
                </div>
              </div>
            </div>

            {/* Total Sessions */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-success/10 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6 sm:w-7 sm:h-7 text-success"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-2xl sm:text-3xl font-bold text-success">
                  {sessions.length}
                </div>
                <div className="text-xs sm:text-sm text-base-content/60">
                  Total Session{sessions.length !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionContributionGrid;
