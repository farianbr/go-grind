import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import {
  Check,
  Coffee,
  Play,
  Plus,
  Square,
  Timer,
  Trash2,
  Undo2,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  addSessionTask,
  completeSession,
  deleteSessionTask,
  endBreak,
  extendSession,
  getActiveSoloSession,
  heartbeatSession,
  startBreak,
  startSoloSession,
  updateSessionTask,
} from "../lib/api";

const PRESETS = [
  { mins: 25, label: "Quick", hint: "One task" },
  { mins: 50, label: "Standard", hint: "A proper block" },
  { mins: 90, label: "Deep", hint: "Hard problems" },
  { mins: 120, label: "Marathon", hint: "Ship a thing" },
];
const EXTEND_OPTIONS = [5, 15, 30];
const HEARTBEAT_MS = 30_000;

const pad = (n) => String(n).padStart(2, "0");

function formatClock(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0
    ? `${h}:${pad(m)}:${pad(s % 60)}`
    : `${pad(m)}:${pad(s % 60)}`;
}

function breakMs(session, now) {
  return (session.breaks || []).reduce((total, b) => {
    if (!b.startedAt) return total;
    const end = b.endedAt ? new Date(b.endedAt) : now;
    return total + Math.max(0, end - new Date(b.startedAt));
  }, 0);
}

const FocusPage = () => {
  const queryClient = useQueryClient();
  const [topic, setTopic] = useState("");
  const [target, setTarget] = useState(50);
  const [plannedTasks, setPlannedTasks] = useState([]);
  const [taskDraft, setTaskDraft] = useState("");
  const [reflection, setReflection] = useState("");
  const [summary, setSummary] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const topicRef = useRef(null);
  const taskRef = useRef(null);

  const { data: session, isLoading } = useQuery({
    queryKey: ["soloSession"],
    queryFn: getActiveSoloSession,
  });

  const setSession = (next) => queryClient.setQueryData(["soloSession"], next);
  const onError = (fallback) => (error) =>
    toast.error(error?.response?.data?.message ?? fallback);

  const { mutate: start, isPending: isStarting } = useMutation({
    mutationFn: startSoloSession,
    onSuccess: (created) => {
      setSession(created);
      setPlannedTasks([]);
      toast.success("Clock's running. Go.");
    },
    onError: onError("Couldn't start your session."),
  });

  const { mutate: finish, isPending: isFinishing } = useMutation({
    mutationFn: completeSession,
    onSuccess: (done) => {
      setSession(null);
      queryClient.invalidateQueries({ queryKey: ["mySessions"] });
      setSummary(done);
      setTopic("");
      setReflection("");
    },
    onError: onError("Couldn't close your session."),
  });

  const { mutate: addTask, isPending: isAddingTask } = useMutation({
    mutationFn: ({ id, title }) => addSessionTask(id, title),
    onSuccess: setSession,
    onError: onError("Couldn't add that task."),
  });

  const { mutate: toggleTask } = useMutation({
    mutationFn: ({ id, taskId, isCompleted }) =>
      updateSessionTask(id, taskId, isCompleted),
    onSuccess: setSession,
    onError: onError("Couldn't update that task."),
  });

  const { mutate: removeTask } = useMutation({
    mutationFn: ({ id, taskId }) => deleteSessionTask(id, taskId),
    onSuccess: setSession,
    onError: onError("Couldn't remove that task."),
  });

  const { mutate: toggleBreak, isPending: isTogglingBreak } = useMutation({
    mutationFn: ({ id, resume }) => (resume ? endBreak(id) : startBreak(id)),
    onSuccess: (updated) => {
      setSession(updated);
      toast.success(
        updated.breaks?.some((b) => !b.endedAt)
          ? "On a break. The clock is paused."
          : "Back to it."
      );
    },
    onError: onError("Couldn't change your break."),
  });

  const { mutate: extend, isPending: isExtending } = useMutation({
    mutationFn: ({ id, minutes }) => extendSession(id, minutes),
    onSuccess: (updated) => {
      setSession(updated);
      toast.success(`Extended to ${updated.targetDuration} minutes.`);
    },
    onError: onError("Couldn't extend the session."),
  });

  // One ticking clock for the whole page.
  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    setNow(Date.now());
    return () => clearInterval(id);
  }, [session]);

  useEffect(() => {
    if (!session?._id) return;
    const id = setInterval(() => {
      heartbeatSession(session._id).catch(() => {});
    }, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [session?._id]);

  useEffect(() => {
    if (!session && !isLoading && !summary) topicRef.current?.focus();
  }, [session, isLoading, summary]);

  const onBreak = useMemo(
    () => Boolean(session?.breaks?.some((b) => !b.endedAt)),
    [session]
  );

  // Worked seconds exclude break time, so the number means what it says.
  const workedSeconds = useMemo(() => {
    if (!session) return 0;
    const nowDate = new Date(now);
    const elapsed = nowDate - new Date(session.startTime);
    return Math.max(0, (elapsed - breakMs(session, nowDate)) / 1000);
  }, [session, now]);

  const breakSeconds = useMemo(
    () => (session ? breakMs(session, new Date(now)) / 1000 : 0),
    [session, now]
  );

  const targetSeconds = (session?.targetDuration ?? target) * 60;
  const remaining = targetSeconds - workedSeconds;
  const progress = Math.min(100, Math.round((workedSeconds / targetSeconds) * 100));
  const overrun = remaining < 0;

  const tasks = session?.tasks ?? [];
  const doneCount = tasks.filter((t) => t.isCompleted).length;

  const handleStart = (e) => {
    e.preventDefault();
    if (!topic.trim()) {
      toast.error("What are you working on?");
      topicRef.current?.focus();
      return;
    }
    start({
      workTopic: topic.trim(),
      targetDuration: target,
      tasks: plannedTasks,
    });
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    const title = taskDraft.trim();
    if (!title) return;

    if (session) {
      addTask({ id: session._id, title });
    } else {
      setPlannedTasks((prev) => [...prev, title]);
    }
    setTaskDraft("");
    taskRef.current?.focus();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  // ---- finished: a short summary, then straight back to work ---------------
  if (summary && !session) {
    const done = summary.tasks?.filter((t) => t.isCompleted).length ?? 0;
    const stats = [
      { label: "Worked", value: `${summary.actualDuration}m` },
      { label: "Target", value: `${summary.targetDuration}m` },
      { label: "Tasks done", value: `${done}/${summary.tasks?.length ?? 0}` },
    ];

    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="container mx-auto max-w-xl">
          <p className="text-xs uppercase tracking-wider text-success font-medium">
            Session logged
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
            {summary.workTopic}
          </h1>

          <dl className="flex gap-8 sm:gap-10 border-y border-base-300 py-5 mt-5">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt className="text-[11px] uppercase tracking-wide text-base-content/50">
                  {stat.label}
                </dt>
                <dd className="text-2xl font-bold font-mono tabular-nums tracking-tight mt-0.5">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-wrap gap-2 mt-6">
            <button
              onClick={() => setSummary(null)}
              className="btn btn-primary"
            >
              Start another
            </button>
            <Link to="/" className="btn btn-ghost">
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---- setup ---------------------------------------------------------------
  if (!session) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="container mx-auto max-w-2xl">
          <div>
            <div className="pb-5 mb-6 border-b border-base-300">
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Take a desk
                </h1>
                <p className="text-sm text-base-content/70">
                  Say what you're working on and how long you've got. Nobody to
                  wait for.
                </p>
              </div>
            </div>

              <form onSubmit={handleStart} className="space-y-6">
                <fieldset className="fieldset">
                  <label className="label" htmlFor="topic">
                    What are you working on?
                  </label>
                  <input
                    id="topic"
                    ref={topicRef}
                    type="text"
                    className="input input-lg w-full"
                    placeholder="Finish the pricing page"
                    value={topic}
                    maxLength={120}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </fieldset>

                <div className="space-y-2">
                  <span className="label">How long?</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PRESETS.map((p) => (
                      <button
                        key={p.mins}
                        type="button"
                        aria-pressed={target === p.mins}
                        onClick={() => setTarget(p.mins)}
                        className={`btn h-auto py-2.5 flex-col gap-0.5 ${
                          target === p.mins ? "btn-primary" : "btn-outline"
                        }`}
                      >
                        <span className="font-bold">{p.mins}m</span>
                        <span className="text-[11px] font-normal opacity-70">
                          {p.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="label">
                    Plan your tasks{" "}
                    <span className="text-base-content/50">(optional)</span>
                  </span>

                  {plannedTasks.length > 0 && (
                    <ul className="space-y-1.5">
                      {plannedTasks.map((t, i) => (
                        <li
                          key={`${t}-${i}`}
                          className="flex items-center gap-2 rounded-field bg-base-200 px-3 py-2"
                        >
                          <span className="flex-1 text-sm">{t}</span>
                          <button
                            type="button"
                            aria-label={`Remove ${t}`}
                            onClick={() =>
                              setPlannedTasks((prev) =>
                                prev.filter((_, idx) => idx !== i)
                              )
                            }
                            className="btn btn-ghost btn-xs btn-circle"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex gap-2">
                    <input
                      ref={taskRef}
                      type="text"
                      className="input flex-1"
                      placeholder="Add a task"
                      value={taskDraft}
                      maxLength={140}
                      onChange={(e) => setTaskDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddTask(e);
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddTask}
                      className="btn btn-outline btn-square"
                      aria-label="Add task"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg w-full gap-2"
                  disabled={isStarting}
                >
                  {isStarting ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    <Play className="size-5" />
                  )}
                  Start {target}-minute session
                </button>
              </form>

            <p className="text-xs text-base-content/50 text-center mt-6 pt-5 border-t border-base-300">
              Rather have company?{" "}
              <Link to="/rooms" className="link link-primary">
                Join a room and work alongside others
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---- running -------------------------------------------------------------
  //
  // Laid out as a desk rather than two matching panels: the clock and the work
  // topic carry the page, and the task list sits beside them on a hairline. The
  // old version boxed both halves in identical cards, so neither led.
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="container mx-auto max-w-4xl">
        <header className="pb-5 border-b border-base-300">
          <div
            className={`inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider ${
              onBreak ? "text-warning" : overrun ? "text-success" : "text-primary"
            }`}
          >
            {onBreak ? (
              <Coffee className="size-3.5" />
            ) : (
              <Timer className="size-3.5" />
            )}
            {onBreak ? "On a break" : overrun ? "Over target" : "At your desk"}
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight mt-1 text-balance">
            {session.workTopic}
          </h1>
        </header>

        <div className="grid lg:grid-cols-[1.3fr_1fr] gap-8 lg:gap-14 mt-6 items-start">
          {/* clock */}
          <section className="min-w-0">
            <div
              className={`font-mono text-6xl sm:text-7xl font-bold tabular-nums tracking-tighter leading-none ${
                onBreak ? "text-base-content/40" : ""
              }`}
              role="timer"
              aria-live="off"
            >
              {overrun ? "+" : ""}
              {formatClock(Math.abs(remaining))}
            </div>
            <p className="text-sm text-base-content/55 mt-2">
              {overrun ? "past target" : "remaining"} ·{" "}
              {formatClock(workedSeconds)} worked
              {breakSeconds > 30 && ` · ${formatClock(breakSeconds)} on break`}
            </p>

            <div className="mt-5 space-y-1.5">
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
              <p className="text-xs text-base-content/50 font-mono tabular-nums">
                {progress}% of {session.targetDuration} min
              </p>
            </div>

            <div className="flex flex-wrap gap-2 mt-5">
              <button
                onClick={() =>
                  toggleBreak({ id: session._id, resume: onBreak })
                }
                className={`btn btn-sm gap-1.5 ${
                  onBreak ? "btn-warning" : "btn-outline"
                }`}
                disabled={isTogglingBreak}
              >
                {isTogglingBreak ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : onBreak ? (
                  <Undo2 className="size-4" />
                ) : (
                  <Coffee className="size-4" />
                )}
                {onBreak ? "Back to it" : "Take a break"}
              </button>

              <div className="dropdown dropdown-end">
                <button
                  tabIndex={0}
                  className="btn btn-sm btn-outline gap-1.5"
                  disabled={isExtending}
                >
                  {isExtending ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  Extend
                </button>
                <ul className="dropdown-content menu bg-base-100 rounded-box border border-base-300 shadow-lg z-10 w-36 p-1">
                  {EXTEND_OPTIONS.map((m) => (
                    <li key={m}>
                      <button
                        onClick={() => extend({ id: session._id, minutes: m })}
                      >
                        +{m} minutes
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-base-300 space-y-2">
              <label
                className="text-sm font-medium block"
                htmlFor="reflection"
              >
                How did it go?{" "}
                <span className="text-base-content/50 font-normal">
                  (optional)
                </span>
              </label>
              <input
                id="reflection"
                type="text"
                className="input input-sm w-full"
                placeholder="Shipped the pricing copy, stuck on the table"
                value={reflection}
                maxLength={500}
                onChange={(e) => setReflection(e.target.value)}
              />
              <button
                onClick={() =>
                  finish({ sessionId: session._id, reflection: reflection.trim() })
                }
                className="btn btn-primary w-full gap-2"
                disabled={isFinishing}
              >
                {isFinishing ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  <Square className="size-4" />
                )}
                Finish session
              </button>
            </div>
          </section>

          {/* tasks */}
          <section className="min-w-0">
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <h2 className="font-semibold">Tasks</h2>
              {tasks.length > 0 && (
                <span className="text-xs text-base-content/55 font-mono tabular-nums">
                  {doneCount}/{tasks.length} done
                </span>
              )}
            </div>

            <div className="border-t border-base-300">
              {tasks.length === 0 ? (
                <p className="text-sm text-base-content/60 py-4">
                  Break the work into pieces you can tick off. It makes the
                  finish line visible.
                </p>
              ) : (
                <ul className="divide-y divide-base-300">
                  {tasks.map((t) => (
                    <li
                      key={t._id}
                      className="group flex items-center gap-2.5 py-2.5"
                    >
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm checkbox-primary"
                        checked={t.isCompleted}
                        onChange={() =>
                          toggleTask({
                            id: session._id,
                            taskId: t._id,
                            isCompleted: !t.isCompleted,
                          })
                        }
                        aria-label={t.title}
                      />
                      <span
                        className={`flex-1 text-sm ${
                          t.isCompleted
                            ? "line-through text-base-content/40"
                            : ""
                        }`}
                      >
                        {t.title}
                      </span>
                      <button
                        onClick={() =>
                          removeTask({ id: session._id, taskId: t._id })
                        }
                        className="btn btn-ghost btn-xs btn-circle opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                        aria-label={`Remove ${t.title}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <form
                onSubmit={handleAddTask}
                className="flex gap-2 pt-3 border-t border-base-300"
              >
                <input
                  ref={taskRef}
                  type="text"
                  className="input input-sm flex-1"
                  placeholder="Add a task"
                  value={taskDraft}
                  maxLength={140}
                  onChange={(e) => setTaskDraft(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn btn-sm btn-outline btn-square"
                  disabled={isAddingTask}
                  aria-label="Add task"
                >
                  {isAddingTask ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                </button>
              </form>

              {doneCount > 0 && doneCount === tasks.length && (
                <p className="flex items-center gap-2 text-sm text-success mt-3">
                  <Check className="size-4" />
                  Everything ticked off. Finish up or add more.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default FocusPage;
