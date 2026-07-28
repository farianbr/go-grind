// How long a session may keep accruing time past its own target before we stop
// believing it. Sessions are closed by an explicit leaveStream call, so a user
// who closes the tab, drops connection or crashes never closes theirs — without
// a ceiling those rows accumulate wall-clock time indefinitely.
const OVERRUN_FACTOR = 2;
const DEFAULT_TARGET_MINUTES = 60;

// Anything still open after this is treated as abandoned by the sweeper.
export const ABANDON_AFTER_MINUTES = 6 * 60;

// Total milliseconds spent on break, counting an open break up to `now`.
export function breakMs(session, now = new Date()) {
  return (session.breaks || []).reduce((total, b) => {
    if (!b.startedAt) return total;
    const end = b.endedAt ? new Date(b.endedAt) : now;
    return total + Math.max(0, end - new Date(b.startedAt));
  }, 0);
}

export function cappedDuration(session, endTime = new Date()) {
  const elapsedMs = endTime - session.startTime - breakMs(session, endTime);
  const rawMinutes = Math.round(elapsedMs / (1000 * 60));
  const target = session.targetDuration || DEFAULT_TARGET_MINUTES;
  const ceiling = target * OVERRUN_FACTOR;

  return {
    minutes: Math.max(0, Math.min(rawMinutes, ceiling)),
    exceededCeiling: rawMinutes > ceiling,
  };
}

// Closes every session that stopped reporting in. Safe to call often: the work
// is a single indexed query that usually matches nothing.
//
// Production runs on Vercel where the process is ephemeral, so a setInterval
// would not survive. Instead this is invoked opportunistically (throttled per
// process) and is also exposed as an endpoint a scheduler can hit.
export async function sweepAbandonedSessions() {
  const { default: Session } = await import("../models/Session.model.js");

  const cutoff = new Date(Date.now() - ABANDON_AFTER_MINUTES * 60 * 1000);
  const stale = await Session.find({
    isCompleted: false,
    $or: [{ lastSeenAt: { $lt: cutoff } }, { startTime: { $lt: cutoff } }],
  }).limit(200);

  let closed = 0;
  for (const session of stale) {
    if (await closeSession(session, { abandoned: true })) closed++;
  }
  return closed;
}

let lastSweep = 0;
const SWEEP_THROTTLE_MS = 10 * 60 * 1000;

export async function maybeSweep() {
  if (Date.now() - lastSweep < SWEEP_THROTTLE_MS) return 0;
  lastSweep = Date.now();
  try {
    return await sweepAbandonedSessions();
  } catch (error) {
    console.error("Session sweep failed", error);
    return 0;
  }
}

// Closes a session with a trustworthy duration. Returns true if it wrote.
export async function closeSession(session, { abandoned = false } = {}) {
  if (!session || session.isCompleted) return false;

  const endTime = new Date();
  const { minutes, exceededCeiling } = cappedDuration(session, endTime);

  session.endTime = endTime;
  session.actualDuration = minutes;
  session.isCompleted = true;
  session.abandoned = abandoned || exceededCeiling;

  await session.save();
  return true;
}
