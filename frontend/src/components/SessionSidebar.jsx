import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentSession, updateSessionTask } from "../lib/api";
import {
  Clock,
  CheckSquare,
  Square,
  PanelRightClose,
  PanelRightOpen,
  Target,
  Plus,
  X,
  ListTodo,
  Trophy,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";

const SessionSidebar = ({ spaceId, authUser, defaultVisible = true, participantCount = 0, onToggleVisibility, externalVisible }) => {
  const [internalVisible, setInternalVisible] = useState(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return defaultVisible;
    }
    return true;
  });
  
  // Use external visibility if provided, otherwise use internal state
  const isVisible = externalVisible !== undefined ? externalVisible : internalVisible;
  const setIsVisible = (value) => {
    if (externalVisible !== undefined && onToggleVisibility) {
      // If controlled from parent, notify parent
      onToggleVisibility(value);
    } else {
      // Otherwise use internal state
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

  // Notify parent component when visibility changes (for uncontrolled mode)
  useEffect(() => {
    if (externalVisible === undefined && onToggleVisibility) {
      onToggleVisibility(internalVisible);
    }
  }, [internalVisible, onToggleVisibility, externalVisible]);

  // Fetch current session
  const { data: session, isLoading } = useQuery({
    queryKey: ["currentSession", spaceId, authUser._id],
    queryFn: () => getCurrentSession(spaceId),
    enabled: !!spaceId && !!authUser,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Update task mutation
  const { mutate: updateTask, isPending: isUpdatingTask } = useMutation({
    mutationFn: ({ sessionId, taskId, isCompleted }) =>
      updateSessionTask(sessionId, taskId, isCompleted),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["currentSession", spaceId, authUser._id],
      });
      setUpdatingTaskId(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update task");
      setUpdatingTaskId(null);
    },
  });

  // Add task mutation (we'll need to create this API endpoint)
  const { mutate: addTask, isPending: isAddingTaskMutation } = useMutation({
    mutationFn: async ({ sessionId, title }) => {
      // For now, we'll need to create this endpoint
      const { axiosInstance } = await import("../lib/axios");
      const response = await axiosInstance.post(
        `/sessions/${sessionId}/tasks`,
        { title }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["currentSession", spaceId, authUser._id],
      });
      setNewTaskTitle("");
      setIsAddingTask(false);
      toast.success("Task added");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to add task");
    },
  });

  // Timer effect - only count when in call (component is mounted)
  useEffect(() => {
    if (!session) return;

    const startTime = new Date(session.startTime).getTime();
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000); // in seconds
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
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
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

  return (
    <>
      {/* Sidebar */}
      <div
        className={`bg-base-200 shadow-2xl transition-all duration-300 ease-in-out overflow-y-auto border-l border-base-300 ${
          isVisible ? "w-full md:w-80 lg:w-96 translate-x-0" : "w-0 translate-x-full"
        }`}
        style={{ height: "100%" }}
      >
        {isVisible && (
          <div className="p-4 sm:p-6 space-y-6">
            {/* Header with close button */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold">Session Details</h2>
                <p className="text-sm text-base-content/70 mt-1 truncate">
                  {session.grindingTopic}
                </p>
              </div>
              <button
                onClick={() => setIsVisible(false)}
                className="btn btn-ghost btn-circle btn-sm shrink-0"
                title="Close sidebar"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Member Count - Only show on screens below xl */}
            {participantCount > 0 && (
              <div className="xl:hidden">
                <div className="card bg-base-100 shadow-lg">
                  <div className="card-body p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="size-5 text-primary" />
                        <h3 className="font-semibold">Participants</h3>
                      </div>
                      <span className="text-2xl font-bold text-primary">
                        {participantCount}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Timer Section */}
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="size-5 text-primary" />
                  <h3 className="font-semibold">Timer</h3>
                </div>

                {/* Elapsed Time */}
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold font-mono text-primary">
                    {formatTime(elapsedTime)}
                  </div>
                  <p className="text-xs text-base-content/60 mt-1">
                    Elapsed Time
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-base-content/70">
                      Progress
                    </span>
                    <span className="text-xs font-semibold">
                      {getProgress().toFixed(0)}%
                    </span>
                  </div>
                  <progress
                    className={`progress ${
                      isTargetReached()
                        ? "progress-success"
                        : "progress-primary"
                    } w-full`}
                    value={getProgress()}
                    max="100"
                  ></progress>
                </div>

                {/* Target Duration */}
                <div className="flex items-center justify-between bg-base-200 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Target className="size-4 text-base-content/70" />
                    <span className="text-sm">Target Duration</span>
                  </div>
                  <span className="font-semibold">
                    {formatTargetTime(session.targetDuration)}
                  </span>
                </div>

                {/* Target Reached Badge */}
                {isTargetReached() && (
                  <div className="alert alert-success mt-3 py-2">
                    <Trophy className="size-4" />
                    <span className="text-sm">Target reached!</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tasks Section */}
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ListTodo className="size-5 text-primary" />
                    <h3 className="font-semibold">Tasks</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="badge badge-primary">
                      {session.tasks.filter((t) => t.isCompleted).length}/
                      {session.tasks.length}
                    </div>
                    <button
                      className="btn btn-ghost btn-xs btn-circle"
                      onClick={() => setIsAddingTask(!isAddingTask)}
                      title="Add new task"
                    >
                      {isAddingTask ? (
                        <X className="size-4" />
                      ) : (
                        <Plus className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Add Task Form */}
                {isAddingTask && (
                  <div className="mb-3 flex gap-2">
                    <input
                      type="text"
                      placeholder="New task..."
                      className="input  input-sm flex-1"
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
                      className="btn btn-primary btn-sm rounded"
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
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {session.tasks.map((task) => {
                      const isTaskUpdating = updatingTaskId === task._id;
                      return (
                        <div
                          key={task._id}
                          className={`flex items-start gap-3 p-3 bg-base-200 rounded-lg transition-colors ${
                            isTaskUpdating
                              ? "opacity-60 cursor-wait"
                              : "hover:bg-base-300 cursor-pointer"
                          }`}
                          onClick={() => {
                            if (!isTaskUpdating) {
                              handleToggleTask(task._id, task.isCompleted);
                            }
                          }}
                        >
                          <div className="pt-0.5">
                            {isTaskUpdating ? (
                              <span className="loading loading-spinner loading-sm text-primary"></span>
                            ) : task.isCompleted ? (
                              <CheckSquare className="size-5 text-success shrink-0" />
                            ) : (
                              <Square className="size-5 text-base-content/50 shrink-0" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm wrap-break-word ${
                                task.isCompleted
                                  ? "line-through text-base-content/60"
                                  : ""
                              }`}
                            >
                              {task.title}
                            </p>
                            {task.isCompleted && task.completedAt && (
                              <p className="text-xs text-base-content/50 mt-1">
                                Completed{" "}
                                {format(new Date(task.completedAt), "h:mm a")}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-base-content/60">
                    <p className="text-sm">No tasks yet</p>
                    <p className="text-xs mt-1">Click + to add a task</p>
                  </div>
                )}

                {/* Task Progress */}
                {session.tasks.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-base-300">
                    <div className="flex justify-between items-center text-xs text-base-content/70 mb-2">
                      <span>Task Completion</span>
                      <span>
                        {(
                          (session.tasks.filter((t) => t.isCompleted).length /
                            session.tasks.length) *
                          100
                        ).toFixed(0)}
                        %
                      </span>
                    </div>
                    <progress
                      className="progress progress-success w-full"
                      value={session.tasks.filter((t) => t.isCompleted).length}
                      max={session.tasks.length}
                    ></progress>
                  </div>
                )}
              </div>
            </div>

            {/* Session Info */}
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body p-4">
                <h3 className="font-semibold mb-3">Session Info</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-base-content/70">Started at</span>
                    <span className="font-semibold">
                      {format(new Date(session.startTime), "h:mm a")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/70">Date</span>
                    <span className="font-semibold">
                      {new Date(session.startTime).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Export toggle button state via props */}
    </>
  );
};

// Export a separate toggle button component
export const SidebarToggleButton = ({ onClick }) => (
  <button
    onClick={onClick}
    className="btn btn-circle btn-sm sm:btn-md btn-primary shadow-lg transition-all duration-200 hover:scale-110"
    title="Show sidebar"
  >
    <PanelRightOpen className="size-4 sm:size-5" />
  </button>
);

export default SessionSidebar;
