import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Coffee, Timer } from "lucide-react";

const pad = (n) => String(n).padStart(2, "0");

function breakMs(session, now) {
  return (session.breaks || []).reduce((total, b) => {
    if (!b.startedAt) return total;
    const end = b.endedAt ? new Date(b.endedAt) : now;
    return total + Math.max(0, end - new Date(b.startedAt));
  }, 0);
}

/**
 * Shown on the dashboard in place of the "start a session" prompt whenever one
 * is already running, so the two screens can't contradict each other.
 */
const ActiveSessionCard = ({ session, onBreak }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const nowDate = new Date(now);
  const workedSeconds = Math.max(
    0,
    (nowDate - new Date(session.startTime) - breakMs(session, nowDate)) / 1000
  );
  const targetSeconds = session.targetDuration * 60;
  const remaining = targetSeconds - workedSeconds;
  const overrun = remaining < 0;
  const progress = Math.min(100, Math.round((workedSeconds / targetSeconds) * 100));

  const abs = Math.abs(Math.floor(remaining));
  const clock = `${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;

  const tasks = session.tasks ?? [];
  const done = tasks.filter((t) => t.isCompleted).length;

  return (
    <div className="card overflow-hidden border border-primary/30 bg-primary/5">
      <div className="card-body p-5 sm:p-6 gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div
              className={`inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider ${
                onBreak ? "text-warning" : "text-primary"
              }`}
            >
              {onBreak ? (
                <>
                  <Coffee className="size-3.5" /> On a break
                </>
              ) : (
                <>
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                    <span className="relative inline-flex size-2 rounded-full bg-primary" />
                  </span>
                  Session in progress
                </>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
              {session.workTopic}
            </h2>

            <p className="text-sm text-base-content/70">
              <span className="font-mono font-semibold tabular-nums">
                {overrun ? "+" : ""}
                {clock}
              </span>{" "}
              {overrun ? "past target" : "remaining"}
              {tasks.length > 0 && ` · ${done}/${tasks.length} tasks done`}
            </p>
          </div>

          <Link to="/focus" className="btn btn-primary gap-2 shrink-0">
            Back to session
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="space-y-1">
          <progress
            className={`progress w-full ${
              onBreak
                ? "progress-warning"
                : overrun
                ? "progress-success"
                : "progress-primary"
            }`}
            value={progress}
            max="100"
          />
          <p className="text-xs text-base-content/60">
            <Timer className="inline size-3 mr-1" />
            {progress}% of {session.targetDuration} min
          </p>
        </div>
      </div>
    </div>
  );
};

export default ActiveSessionCard;
