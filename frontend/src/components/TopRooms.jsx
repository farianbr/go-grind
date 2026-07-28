import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllRooms } from "../lib/api";
import { Users, Clock } from "lucide-react";
import { Link } from "react-router";

const TopRooms = () => {
  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ["rooms"],
    queryFn: getAllRooms,
  });

  const topRooms = useMemo(() => {
    return [...rooms]
      .map((room) => {
        const totalMinutes = room.totalStreamedMinutes || 0;
        const totalHours = totalMinutes / 60;
        return { ...room, totalHours };
      })
      .sort((a, b) => b.totalHours - a.totalHours)
      .slice(0, 5);
  }, [rooms]);

  const formatHours = (hours) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    return `${Math.round(hours)}h`;
  };

  return (
    <div className="card bg-base-200">
      <div className="card-body p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Global Top Rooms</h3>
          <Link to="/rooms" className="btn btn-ghost btn-xs">View all</Link>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : topRooms.length === 0 ? (
          <div className="text-sm text-base-content/60">No rooms available.</div>
        ) : (
          <div className="space-y-2">
            {topRooms.map((room, index) => (
              <Link 
                key={room._id} 
                to={`/rooms/${room._id}`} 
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-base-300 transition-colors border border-base-300"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-sm">
                  #{index + 1}
                </div>
                
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{room.name}</p>
                  <p className="text-xs text-base-content/60 truncate">
                    {room.team?.name ?? "Open to anyone"}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1 text-success font-semibold">
                    <Clock className="size-3" /> {formatHours(room.totalHours)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-base-content/60">
                    <Users className="size-3" /> {room.members?.length || 0}
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

export default TopRooms;
