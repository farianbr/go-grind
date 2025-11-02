import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllSpaces } from "../lib/api";
import { Users, Clock } from "lucide-react";
import { capitalize } from "../lib/utils";
import { Link } from "react-router";

const TopSpaces = () => {
  const { data: spaces = [], isLoading } = useQuery({
    queryKey: ["spaces"],
    queryFn: getAllSpaces,
  });

  const topSpaces = useMemo(() => {
    return [...spaces]
      .map((space) => {
        // Use backend-calculated totalStreamedMinutes
        const totalMinutes = space.totalStreamedMinutes || 0;
        const totalHours = totalMinutes / 60;
        return { ...space, totalHours };
      })
      .sort((a, b) => b.totalHours - a.totalHours)
      .slice(0, 5);
  }, [spaces]);

  const formatHours = (hours) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    return `${Math.round(hours)}h`;
  };

  return (
    <div className="card bg-base-200">
      <div className="card-body p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Global Top Spaces</h3>
          <Link to="/spaces" className="btn btn-ghost btn-xs">View all</Link>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : topSpaces.length === 0 ? (
          <div className="text-sm text-base-content/60">No spaces available.</div>
        ) : (
          <div className="space-y-2">
            {topSpaces.map((space, index) => (
              <Link 
                key={space._id} 
                to={`/spaces/${space._id}`} 
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-base-300 transition-colors border border-base-300"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-sm">
                  #{index + 1}
                </div>
                
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{space.name}</p>
                  <p className="text-xs text-base-content/60 truncate">{capitalize(space.skill)}</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1 text-success font-semibold">
                    <Clock className="size-3" /> {formatHours(space.totalHours)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-base-content/60">
                    <Users className="size-3" /> {space.members?.length || 0}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopSpaces;
