import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentSession, updateSessionTask } from "../lib/api";
import { axiosInstance } from "../lib/axios";
import {
  Clock,
  CheckSquare,
  Square,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  X,
  Trophy,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";

const SessionSidebar = ({ roomId, authUser, defaultVisible = true, participantCount = 0, onToggleVisibility, externalVisible }) => {
  const [internalVisible, setInternalVisible] = useState(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return defaultVisible;
    }
    return true;
  });
  
  const isVisible = externalVisible !== undefined ? externalVisible : internalVisible;
  const setIsVisible = (value) => {
    if (externalVisible !== undefined && onToggleVisibility) {
      onToggleVisibility(value);
    } else {
      setInternalVisible(value);
      if (onToggleVisibility) {
        onToggleVisibility(value);
      }
    }
  };
  
  const [elapsedTime, setElapsedTime] = useState(0);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (externalVisible === undefined && onToggleVisibility) {
      onToggleVisibility(internalVisible);
    }
  }, [internalVisible, onToggleVisibility, externalVisible]);

  const { data: session, isLoading } = useQuery({
    queryKey: ["currentSession", roomId, authUser._id],
    queryFn: () => getCurrentSession(roomId),
    enabled: !!roomId && !!authUser,
    refetchInterval: 30000,
  });

  const { mutate: updateTask, isPending: isUpdatingTask } = useMutation({
    mutationFn: ({ sessionId, taskId, isCompleted }) =>
      updateSessionTask(sessionId, taskId, isCompleted),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["currentSession", roomId, authUser._id],
      });
      setUpdatingTaskId(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update task");
      setUpdatingTaskId(null);
    },
  });

  const { mutate: addTask, isPending: isAddingTaskMutation } = useMutation({
    mutationFn: async ({ sessionId, title }) => {
      
      const response = await axiosInstance.post(
        `/sessions/${sessionId}/tasks`,
        { title }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["currentSession", roomId, authUser._id],
      });
      setNewTaskTitle("");
      setIsAddingTask(false);
      toast.success("Task added");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to add task");
    },
  });

  useEffect(() => {
    if (!session) return;

    const startTime = new Date(session.startTime).getTime();
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  const handleToggleTask = (taskId, currentStatus) => {
    if (!session || isUpdatingTask) return;
    setUpdatingTaskId(taskId);
    updateTask({
      sessionId: session._id,
      taskId,
      isCompleted: !currentStatus,
    });
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) {
      toast.error("Please enter a task title");
      return;
    }
    addTask({
      sessionId: session._id,
      title: newTaskTitle.trim(),
    });
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTargetTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    return `${mins}m`;
  };

  const getProgress = () => {
    if (!session) return 0;
    const targetSeconds = session.targetDuration * 60;
    return Math.min((elapsedTime / targetSeconds) * 100, 100);
  };

  const isTargetReached = () => {
    if (!session) return false;
    return elapsedTime >= session.targetDuration * 60;
  };

  if (isLoading || !session) {
    return null;
  }

  const doneCount = session.tasks.filter((t) => t.isCompleted).length;

  return (
    <div
      className={`bg-base-100 overflow-y-auto border-l border-base-300 shrink-0 ${
        isVisible ? "w-full md:w-80 lg:w-96" : "w-0"
      }`}
      style={{ height: "100%" }}
    >
      {isVisible && (
        <div className="p-4 sm:p-5 space-y-6">
          {/* Your own desk, from your side. Nested cards on a panel this
              narrow were four boxes deep; hairlines carry the sections. */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-base-content/50">
                Your desk
              </p>
              <h2 className="font-semibold leading-snug mt-0.5">
                {session.workTopic}
              </h2>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="btn btn-ghost btn-sm btn-circle shrink-0"
              title="Hide this panel"
              aria-label="Hide this panel"
            >
              <PanelRightClose className="size-4" />
            </button>
          </div>

          <section className="border-t border-base-300 pt-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-mono text-3xl font-bold tabular-nums tracking-tight">
                {formatTime(elapsedTime)}
              </span>
              <span className="text-xs text-base-content/55">
                of {formatTargetTime(session.targetDuration)}
              </span>
            </div>

            <progress
              className={`progress w-full mt-2.5 ${
                isTargetReached() ? "progress-success" : "progress-primary"
              }`}
              value={getProgress()}
              max="100"
            />

            <p className="text-xs text-base-content/55 mt-1.5 inline-flex items-center gap-1.5">
              {isTargetReached() ? (
                <>
                  <Trophy className="size-3.5 text-success" />
                  Target reached. Keep going or close it out.
                </>
              ) : (
                <>
                  <Clock className="size-3.5" />
                  Started {format(new Date(session.startTime), "h:mm a")}
                </>
              )}
            </p>
          </section>

          <section>
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="font-semibold text-sm">Tasks</h3>
              <div className="flex items-center gap-2">
                {session.tasks.length > 0 && (
                  <span className="text-xs font-mono tabular-nums text-base-content/55">
                    {doneCount}/{session.tasks.length}
                  </span>
                )}
                <button
                  className="btn btn-ghost btn-xs btn-circle"
                  onClick={() => setIsAddingTask(!isAddingTask)}
                  title={isAddingTask ? "Cancel" : "Add a task"}
                  aria-label={isAddingTask ? "Cancel" : "Add a task"}
                >
                  {isAddingTask ? (
                    <X className="size-4" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="border-t border-base-300 pt-2">
              {isAddingTask && (
                <div className="mb-2 flex gap-2">
                  <input
                    type="text"
                    placeholder="What's next?"
                    className="input input-sm flex-1"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyUp={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTask();
                      }
                    }}
                    autoFocus
                  />
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleAddTask}
                    disabled={isAddingTaskMutation || !newTaskTitle.trim()}
                  >
                    {isAddingTaskMutation ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      "Add"
                    )}
                  </button>
                </div>
              )}

              {session.tasks.length > 0 ? (
                <ul className="divide-y divide-base-300 max-h-72 overflow-y-auto">
                  {session.tasks.map((task) => {
                    const isTaskUpdating = updatingTaskId === task._id;
                    return (
                      <li key={task._id}>
                        <button
                          type="button"
                          className={`w-full flex items-start gap-2.5 py-2.5 text-left -mx-2 px-2 rounded-field transition-colors ${
                            isTaskUpdating
                              ? "opacity-60 cursor-wait"
                              : "hover:bg-base-200"
                          }`}
                          onClick={() => {
                            if (!isTaskUpdating) {
                              handleToggleTask(task._id, task.isCompleted);
                            }
                          }}
                          disabled={isTaskUpdating}
                        >
                          <span className="pt-0.5 shrink-0">
                            {isTaskUpdating ? (
                              <span className="loading loading-spinner loading-xs text-primary" />
                            ) : task.isCompleted ? (
                              <CheckSquare className="size-4 text-success" />
                            ) : (
                              <Square className="size-4 text-base-content/40" />
                            )}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span
                              className={`block text-sm wrap-break-word ${
                                task.isCompleted
                                  ? "line-through text-base-content/45"
                                  : ""
                              }`}
                            >
                              {task.title}
                            </span>
                            {task.isCompleted && task.completedAt && (
                              <span className="block text-xs text-base-content/45 mt-0.5">
                                Ticked off at{" "}
                                {format(new Date(task.completedAt), "h:mm a")}
                              </span>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-base-content/60 py-3">
                  Break the block into pieces you can tick off. Everyone at the
                  desks beside you can see how far along you are.
                </p>
              )}
            </div>
          </section>

          {/* participantCount includes you, so the copy counts the others. */}
          <p className="text-xs text-base-content/50 border-t border-base-300 pt-3 inline-flex items-center gap-1.5">
            <Users className="size-3.5" />
            {participantCount > 1
              ? `${participantCount - 1} ${
                  participantCount === 2 ? "person" : "people"
                } at the desks beside you`
              : "You have the floor to yourself"}
          </p>
        </div>
      )}
    </div>
  );
};

export const SidebarToggleButton = ({ onClick }) => (
  <button
    onClick={onClick}
    className="btn btn-ghost btn-sm gap-2"
    title="Show your desk"
  >
    <PanelRightOpen className="size-4" />
    <span className="hidden sm:inline">Your desk</span>
  </button>
);

export default SessionSidebar;
