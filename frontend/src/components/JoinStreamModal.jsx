import { useState } from "react";
import { useNavigate } from "react-router";
import { Video, VideoOff, Mic, MicOff } from "lucide-react";
import toast from "react-hot-toast";

const JoinStreamModal = ({ space, isCreator, onJoin, isJoining, authUser }) => {
  const navigate = useNavigate();
  const [grindingTopic, setGrindingTopic] = useState("");
  const [targetDuration, setTargetDuration] = useState(60);
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Add task handler
  const handleAddTask = () => {
    if (!newTaskTitle.trim()) {
      toast.error("Please enter a task title");
      return;
    }
    setTasks([...tasks, { title: newTaskTitle.trim() }]);
    setNewTaskTitle("");
  };

  // Remove task handler
  const handleRemoveTask = (index) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  // Handle join stream
  const handleJoinStream = () => {
    if (!grindingTopic.trim()) {
      toast.error("Please enter what you're grinding");
      return;
    }

    if (!targetDuration || targetDuration < 5) {
      toast.error("Target duration must be at least 5 minutes");
      return;
    }

    // Check if user is already in another stream room
    const allActiveStreamKeys = Object.keys(localStorage).filter(
      (key) =>
        key.startsWith(`stream_${authUser._id}_`) &&
        key.endsWith("_active") &&
        localStorage.getItem(key) === "active"
    );

    if (allActiveStreamKeys.length > 0) {
      // Extract space ID from the key
      const existingStreamSpaceId = allActiveStreamKeys[0]
        .replace(`stream_${authUser._id}_`, "")
        .replace("_active", "");

      // If it's a different space, show error
      if (existingStreamSpaceId !== space._id) {
        toast.error(
          "You're already in another stream room. Please leave it first."
        );
        return;
      }
    }

    onJoin({
      grindingTopic: grindingTopic.trim(),
      targetDuration,
      tasks,
      isVideoEnabled: videoEnabled,
      isAudioEnabled: audioEnabled,
    });
  };

  return (
    <div className="flex items-center justify-center bg-base-200 sm:py-4">
      <div className="card w-full max-w-lg bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl">Join Stream Room</h2>
          <p className="text-base-content/60">Space: {space?.name}</p>

          {/* Stream not initialized warning for non-creators */}
          {!isCreator && !space?.streamInitialized && (
            <div className="alert alert-warning mt-4">
              <div>
                <p className="font-semibold">Stream Room Not Ready</p>
                <p className="text-sm mt-1">
                  The creator needs to enter the stream room first to initialize
                  it.
                </p>
              </div>
            </div>
          )}

          {/* Creator first-time message */}
          {isCreator && !space?.streamInitialized && (
            <div className="alert alert-info mt-4">
              <div>
                <p className="font-semibold">Initialize Stream Room</p>
                <p className="text-sm mt-1">
                  You're entering the stream room for the first time. This will
                  make it available for all members.
                </p>
              </div>
            </div>
          )}

          <fieldset className="fieldset mt-4">
            <label className="label" htmlFor="grinding-topic">
              What are you grinding?
            </label>
            <input
              id="grinding-topic"
              type="text"
              placeholder="e.g., React components, Math problems, etc."
              className="input w-full"
              value={grindingTopic}
              onChange={(e) => setGrindingTopic(e.target.value)}
            />
          </fieldset>

          <fieldset className="fieldset mt-4">
            <label className="label" htmlFor="target-duration">
              Target Duration
            </label>

            {/* Quick Select Buttons */}
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

            {/* Custom Duration Input */}
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
              Session Tasks (Optional)
            </label>
            <div className="flex gap-2">
              <input
                id="session-task"
                type="text"
                placeholder="Add a task for this session"
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
                    >
                      ✕
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
              onClick={() => navigate(`/spaces/${space._id}`)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleJoinStream}
              disabled={isJoining || (!isCreator && !space?.streamInitialized)}
            >
              {isJoining ? (
                <span className="loading loading-spinner"></span>
              ) : (
                "Join Stream"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinStreamModal;
