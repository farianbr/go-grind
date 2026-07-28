/**
 * Seeds the demo account the landing page and auth pages link to.
 *
 * A signed-out visitor's first real look at the product is this account, so it
 * has to look lived-in: a filled streak grid, rooms worth opening, and session
 * history. An empty demo sells nothing.
 *
 * Idempotent — safe to re-run. Existing demo sessions are replaced so the streak
 * stays anchored to today rather than drifting into the past.
 *
 * Usage:  node src/scripts/seed-demo.js
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.model.js";
import Room from "../models/Room.model.js";
import Session from "../models/Session.model.js";
import { getRandomAvatarUrl } from "../lib/avatar.js";

dotenv.config();

const DEMO_EMAIL = "demo@kendro.dev";
const DEMO_PASSWORD = "000000";

const SPACES = [
  {
    name: "Deep Work Mornings",
    description:
      "Two hours of heads-down work before the day gets loud. Turn up, say what you're doing, then go quiet until the timer ends.",
  },
  {
    name: "Thesis & Long Reads",
    description:
      "For the writing that never gets done in short bursts. Chapters, dissertations, long-form drafts. Bring the hard section.",
  },
  {
    name: "Design Studio Hours",
    description:
      "Open studio for designers. Work on the thing you keep avoiding, and show it to the room when the session ends.",
  },
  {
    name: "Ship It Weekly",
    description:
      "One goal per session, shipped before you leave. Side projects, backlog debt, the pull request you keep postponing.",
  },
];

const TOPICS = [
  "Rewrite the onboarding copy",
  "Chapter 4 literature review",
  "Refactor the auth module",
  "Pricing page redesign",
  "Fix the failing test suite",
  "Draft the investor update",
  "Study: distributed systems",
  "Client revisions, round two",
  "Plan next sprint",
  "Portfolio case study",
];

// A believable pattern: most weekdays worked, occasional gaps, a live streak
// running into today.
function sessionPlan() {
  const plan = [];
  for (let daysAgo = 69; daysAgo >= 0; daysAgo--) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const weekday = date.getDay();

    const isWeekend = weekday === 0 || weekday === 6;
    const inCurrentStreak = daysAgo <= 11;

    // Deterministic pseudo-gaps so re-running gives the same shape.
    const skip = !inCurrentStreak && ((daysAgo * 7) % (isWeekend ? 2 : 5) === 0);
    if (skip) continue;

    const count = isWeekend ? 1 : 1 + ((daysAgo * 3) % 2);
    for (let i = 0; i < count; i++) {
      const target = [25, 50, 50, 90][(daysAgo + i) % 4];
      const actual = Math.max(12, target - ((daysAgo + i * 5) % 11));
      const start = new Date(date);
      start.setHours(9 + i * 4, (daysAgo * 13) % 60, 0, 0);
      plan.push({
        topic: TOPICS[(daysAgo + i) % TOPICS.length],
        target,
        actual,
        start,
      });
    }
  }
  return plan;
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected.\n");

  // ---- demo user ----------------------------------------------------------
  let demo = await User.findOne({ email: DEMO_EMAIL }).select("+password");
  if (!demo) {
    demo = await User.create({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD, // hashed by the pre-save hook
      fullName: "Demo User",
      bio: "Looking around Kendro. Mostly here for the streak.",
      location: "Dhaka, Bangladesh",
      role: "Engineering",
      profilePic: getRandomAvatarUrl(),
      isOnboarded: true,
    });
    console.log(`Created ${DEMO_EMAIL}`);
  } else {
    demo.isOnboarded = true;
    demo.bio ||= "Looking around Kendro. Mostly here for the streak.";
    demo.role ||= "programming";
    await demo.save();
    console.log(`Found existing ${DEMO_EMAIL}`);
  }

  // ---- rooms -------------------------------------------------------------
  // Reuse other real accounts as hosts so the demo doesn't own everything.
  const hosts = await User.find({ _id: { $ne: demo._id } }).limit(4);

  let created = 0;
  for (const [i, blueprint] of SPACES.entries()) {
    let room = await Room.findOne({ name: blueprint.name });
    if (!room) {
      room = await Room.create({
        ...blueprint,
        joinPolicy: "open",
        creator: hosts[i % Math.max(hosts.length, 1)]?._id ?? demo._id,
        members: [hosts[i % Math.max(hosts.length, 1)]?._id ?? demo._id],
      });
      created++;
    } else if (room.description !== blueprint.description) {
      // Re-running should converge on the blueprint, not just skip what
      // already exists. Without this, copy edits never reach a database that
      // was seeded once months ago.
      room.description = blueprint.description;
    }
    if (!room.members.some((m) => m.equals(demo._id))) {
      room.members.push(demo._id);
    }
    if (room.isModified()) await room.save();
  }
  console.log(`Rooms: ${created} created, ${SPACES.length} joined`);

  // ---- session history ----------------------------------------------------
  const removed = await Session.deleteMany({ user: demo._id });
  const plan = sessionPlan();
  const docs = plan.map((p) => ({
    user: demo._id,
    room: null,
    workTopic: p.topic,
    targetDuration: p.target,
    actualDuration: p.actual,
    startTime: p.start,
    endTime: new Date(p.start.getTime() + p.actual * 60000),
    lastSeenAt: new Date(p.start.getTime() + p.actual * 60000),
    isCompleted: true,
    abandoned: false,
  }));
  await Session.insertMany(docs);

  const totalMinutes = docs.reduce((a, d) => a + d.actualDuration, 0);
  console.log(
    `Sessions: removed ${removed.deletedCount}, inserted ${docs.length} ` +
      `(${Math.round(totalMinutes / 60)}h across ${
        new Set(docs.map((d) => d.startTime.toDateString())).size
      } days)`
  );

  console.log(`\nDone. Sign in with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
