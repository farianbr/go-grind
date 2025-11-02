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
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
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
        label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
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
    if (minutes === 0) return "bg-base-300/30";
    if (minutes < 30) return "bg-success/30";
    if (minutes < 60) return "bg-success/50";
    if (minutes < 120) return "bg-success/70";
    return "bg-success";
  };

  const formatDuration = (minutes) => {
    if (minutes === 0) return "No sessions";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const totalMinutes = sessions.reduce((sum, s) => sum + (s.actualDuration || 0), 0);
  const totalHours = Math.floor(totalMinutes / 60);

  return (
    <div className="card bg-base-200">
      <div className="card-body p-3 sm:p-4 md:p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
          <h3 className="font-semibold text-sm sm:text-base">Your Grind Activity</h3>
          <span className="text-[10px] sm:text-xs text-base-content/60">
            {totalHours}h total • Last year
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
          <div className="flex-1 overflow-x-auto py-2" ref={scrollContainerRef}>
            <div className="flex gap-0.5 sm:gap-1">
              {contributionData.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-0.5 sm:gap-1">
                  {week.map((day, dayIdx) => (
                    <div
                      key={dayIdx}
                      className={`w-2 h-2 sm:w-3 sm:h-3 rounded-xs sm:rounded-sm ${getIntensityClass(day.minutes)} 
                        hover:ring-1 sm:hover:ring-2 hover:ring-primary hover:scale-110 sm:hover:scale-125 
                        transition-all cursor-pointer`}
                      title={`${day.label}: ${formatDuration(day.minutes)}`}
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
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-xs sm:rounded-sm bg-base-300/30" />
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-xs sm:rounded-sm bg-success/30" />
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-xs sm:rounded-sm bg-success/50" />
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-xs sm:rounded-sm bg-success/70" />
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-xs sm:rounded-sm bg-success" />
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
};

export default SessionContributionGrid;
