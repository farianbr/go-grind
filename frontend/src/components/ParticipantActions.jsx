import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Heart, ListTodo } from "lucide-react";
import toast from "react-hot-toast";
import {
  getCurrentSession,
  encourageParticipant,
  removeEncouragement,
} from "../lib/api";

const ParticipantActions = ({
  participantUserId,
  participantName,
  spaceId,
  authUserId,
}) => {
  const [showTasks, setShowTasks] = useState(false);
  const queryClient = useQueryClient();

  // Fetch participant's session
  const { data: session } = useQuery({
    queryKey: ["participantSession", spaceId, participantUserId],
    queryFn: () => getCurrentSession(spaceId, participantUserId),
    enabled: !!spaceId && !!participantUserId,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Encourage mutation
  const { mutate: encourage, isPending: isEncouraging } = useMutation({
    mutationFn: () => encourageParticipant(session._id),
    onSuccess: () => {
      toast.success(`Encouraged ${participantName}!`);
      queryClient.invalidateQueries({
        queryKey: ["participantSession", spaceId, participantUserId],
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message || "Failed to send encouragement"
      );
    },
  });

  // Remove encouragement mutation
  const { mutate: removeEncourage, isPending: isRemoving } = useMutation({
    mutationFn: () => removeEncouragement(session._id),
    onSuccess: () => {
      toast.success("Encouragement removed");
      queryClient.invalidateQueries({
        queryKey: ["participantSession", spaceId, participantUserId],
      });
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message || "Failed to remove encouragement"
      );
    },
  });

  if (!session) return null;

  const completedTasks =
    session.tasks?.filter((t) => t.isCompleted).length || 0;
  const totalTasks = session.tasks?.length || 0;
  const encouragementCount = session.encouragements?.length || 0;
  const hasEncouraged = session.encouragements?.some(
    (e) => e.user?._id === authUserId
  );
  const isOwnView = participantUserId === authUserId;

  // Determine task status icon (larger default size for better touch targets on small screens)
  const taskStatusIcon =
    totalTasks === 0 ? (
      <Circle className="size-4 sm:size-5 text-base-content/60" />
    ) : completedTasks === totalTasks ? (
      <CheckCircle2 className="size-4 sm:size-5 text-success" />
    ) : (
      <ListTodo className="size-4 sm:size-5 text-warning" />
    );

  const handleEncourageClick = () => {
    if (isOwnView || isEncouraging || isRemoving) return;

    if (hasEncouraged) {
      removeEncourage();
    } else {
      encourage();
    }
  };

  return (
    <div className="flex items-center gap-1">
      {/* Task Status Button */}
      <div className="relative group">
        <button
          onMouseEnter={() => setShowTasks(true)}
          onMouseLeave={() => setShowTasks(false)}
          onTouchStart={() => setShowTasks((prev) => !prev)} // handles first tap
          className="bg-base-100/90 backdrop-blur-xs p-2 sm:p-1.5 rounded-full shadow-lg hover:scale-110 transition-all"
          aria-label="Tasks"
        >
          {taskStatusIcon}
        </button>

        {/* Task Tooltip */}
        {showTasks && (
          <div
            className="absolute bottom-full right-0 mb-1 sm:mb-2 bg-base-100 rounded-lg shadow-xl border border-base-300 p-2 sm:p-3 min-w-[150px] sm:min-w-[180px] z-50"
            onMouseEnter={() => setShowTasks(true)}
            onMouseLeave={() => setShowTasks(false)}
          >
            {totalTasks === 0 ? (
              <p className="text-[10px] sm:text-xs text-base-content/60 text-center">
                No tasks yet
              </p>
            ) : (
              <>
                <h4 className="font-semibold text-[10px] sm:text-xs mb-1 sm:mb-2">
                  Tasks ({completedTasks}/{totalTasks})
                </h4>
                <div className="space-y-0.5 sm:space-y-1 max-h-32 sm:max-h-40 overflow-y-auto">
                  {session.tasks.map((task, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-1 sm:gap-2 text-[9px] sm:text-[10px]"
                    >
                      {task.isCompleted ? (
                        <CheckCircle2 className="size-2.5 sm:size-3 text-success shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="size-2.5 sm:size-3 text-base-content/40 shrink-0 mt-0.5" />
                      )}
                      <span
                        className={`line-clamp-2 ${
                          task.isCompleted
                            ? "line-through text-base-content/60"
                            : ""
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Encourage Button */}
      <button
        onClick={handleEncourageClick}
        disabled={isOwnView || isEncouraging || isRemoving}
        className={`bg-base-100/90 backdrop-blur-xs p-2 sm:p-1.5 rounded-full shadow-lg transition-all flex items-center gap-1 sm:gap-1 ${
          isOwnView
            ? "cursor-not-allowed opacity-70"
            : hasEncouraged
            ? "hover:scale-110"
            : "hover:scale-110"
        }`}
        title={
          isOwnView
            ? "Your encouragements"
            : hasEncouraged
            ? "Remove encouragement"
            : "Encourage"
        }
        aria-label={isOwnView ? "Your encouragements" : "Encourage"}
      >
        <Heart
          className={`size-4 sm:size-5 ${
            hasEncouraged ? "fill-error text-error" : "text-error"
          }`}
        />
        {encouragementCount > 0 && (
          <span className="text-[10px] sm:text-[10px] font-bold pr-0.5 sm:pr-1">
            {encouragementCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default ParticipantActions;
