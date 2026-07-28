import { useState } from "react";
import { useNavigate } from "react-router";
import { Video, VideoOff, Mic, MicOff, X } from "lucide-react";
import toast from "react-hot-toast";

const JoinStreamModal = ({ room, onJoin, isJoining, authUser }) => {
  const navigate = useNavigate();
  const [workTopic, setWorkTopic] = useState("");
  const [targetDuration, setTargetDuration] = useState(60);
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const atDesks = room?.activeStreams?.length ?? 0;

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) {
      toast.error("Please enter a task title");
      return;
    }
    setTasks([...tasks, { title: newTaskTitle.trim() }]);
    setNewTaskTitle("");
  };

  const handleRemoveTask = (index) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleJoinStream = () => {
    if (!workTopic.trim()) {
      toast.error("Say what you're working on");
      return;
    }

    if (!targetDuration || targetDuration < 5) {
      toast.error("Target duration must be at least 5 minutes");
      return;
    }

    const allActiveStreamKeys = Object.keys(localStorage).filter(
      (key) =>
        key.startsWith(`stream_${authUser._id}_`) &&
        key.endsWith("_active") &&
        localStorage.getItem(key) === "active"
    );

    if (allActiveStreamKeys.length > 0) {
      const existingStreamRoomId = allActiveStreamKeys[0]
        .replace(`stream_${authUser._id}_`, "")
        .replace("_active", "");

      if (existingStreamRoomId !== room._id) {
        toast.error(
          "You already have a desk in another room. Leave that one first."
        );
        return;
      }
    }

    onJoin({
      workTopic: workTopic.trim(),
      targetDuration,
      tasks,
      isVideoEnabled: videoEnabled,
      isAudioEnabled: audioEnabled,
    });
  };

  return (
    <div className="flex h-full items-center justify-center bg-base-200 sm:py-4">
      <div className="card w-full max-w-lg bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl">Take a desk</h2>
          {/* Who is already in there, stated before the form: it is the reason
              to walk in rather than work alone. */}
          <p className="text-base-content/60">
            {room?.name}
            {atDesks > 0 && (
              <span className="text-success">
                {" · "}
                {atDesks} already {atDesks === 1 ? "at a desk" : "at desks"}
              </span>
            )}
          </p>

          <fieldset className="fieldset mt-4">
            <label className="label" htmlFor="working-topic">
              What are you working on?
            </label>
            <input
              id="working-topic"
              type="text"
              placeholder="Finish the pricing page"
              className="input w-full"
              value={workTopic}
              onChange={(e) => setWorkTopic(e.target.value)}
            />
            <span className="text-xs text-base-content/50">
              Everyone at the desks beside you sees this.
            </span>
          </fieldset>

          <fieldset className="fieldset mt-4">
            <label className="label" htmlFor="target-duration">
              How long?
            </label>

            <div className="flex flex-wrap gap-2 mb-2">
              {[5, 15, 30, 60, 120, 180].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  className={`btn btn-sm ${
                    targetDuration === mins ? "btn-primary" : "btn-outline"
                  }`}
                  onClick={() => setTargetDuration(mins)}
                >
                  {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                </button>
              ))}
            </div>

            <input
              id="target-duration"
              type="number"
              placeholder="Or enter custom minutes"
              className="input w-full"
              value={targetDuration}
              onChange={(e) => setTargetDuration(parseInt(e.target.value) || 5)}
              min="5"
              step="5"
            />
            <label className="label" htmlFor="target-duration">
              <span className="text-xs opacity-70">Minimum 5 minutes</span>
            </label>
          </fieldset>

          <fieldset className="fieldset mt-4">
            <label className="label" htmlFor="session-task">
              Plan your tasks{" "}
              <span className="text-base-content/50">(optional)</span>
            </label>
            <div className="flex gap-2">
              <input
                id="session-task"
                type="text"
                placeholder="Add a task"
                className="input flex-1"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyUp={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTask();
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-primary rounded"
                onClick={handleAddTask}
              >
                Add
              </button>
            </div>

            {tasks.length > 0 && (
              <div className="mt-3 space-y-2 pr-2">
                {tasks.map((task, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-base-200 rounded-lg"
                  >
                    <span className="flex-1 text-sm wrap-break-word">
                      {task.title}
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs btn-circle shrink-0"
                      onClick={() => handleRemoveTask(index)}
                      aria-label={`Remove ${task.title}`}
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </fieldset>

          <div className="flex gap-4 mt-4">
            <fieldset className="fieldset">
              <label className="label cursor-pointer gap-2">
                {videoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
                <span>Video</span>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={videoEnabled}
                  onChange={(e) => {
                    setVideoEnabled(e.target.checked);
                  }}
                />
              </label>
            </fieldset>

            <fieldset className="fieldset">
              <label className="label cursor-pointer gap-2">
                {audioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                <span>Audio</span>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={audioEnabled}
                  onChange={(e) => {
                    setAudioEnabled(e.target.checked);
                  }}
                />
              </label>
            </fieldset>
          </div>

          <div className="card-actions justify-end mt-6">
            <button
              className="btn btn-ghost"
              onClick={() => navigate(`/rooms/${room._id}`)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleJoinStream}
              disabled={isJoining}
            >
              {isJoining && (
                <span className="loading loading-spinner loading-xs"></span>
              )}
              {isJoining ? "Taking your desk..." : "Take a desk"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinStreamModal;
