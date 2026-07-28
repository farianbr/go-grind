import Session from "../models/Session.model.js";
import Room from "../models/Room.model.js";
import Notification from "../models/Notification.model.js";
import { closeSession, sweepAbandonedSessions } from "../lib/session.js";

// A focus session that belongs to no room. This is the fastest path to value in
// the product: no room, no join request, no approval, no waiting.
export async function startSoloSession(req, res) {
  try {
    const { workTopic, targetDuration } = req.body;

    if (!workTopic || !workTopic.trim()) {
      return res
        .status(400)
        .json({ message: "Tell us what you're working on" });
    }

    const minutes = Number(targetDuration) || 25;
    if (minutes < 1 || minutes > 480) {
      return res
        .status(400)
        .json({ message: "Pick a duration between 1 and 480 minutes" });
    }

    // One live solo session per user: close any earlier one first.
    const existing = await Session.findOne({
      user: req.user.id,
      room: null,
      isCompleted: false,
    });
    if (existing) await closeSession(existing, { abandoned: true });

    // Tasks planned on the setup screen, before a session id existed.
    const tasks = Array.isArray(req.body?.tasks)
      ? req.body.tasks
          .filter((t) => typeof t === "string" && t.trim())
          .slice(0, 20)
          .map((t) => ({ title: t.trim().slice(0, 140), isCompleted: false }))
      : [];

    const session = await Session.create({
      user: req.user.id,
      room: null,
      workTopic: workTopic.trim(),
      targetDuration: minutes,
      startTime: new Date(),
      lastSeenAt: new Date(),
      tasks,
    });

    res.status(201).json(session);
  } catch (error) {
    console.error("Error in startSoloSession controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getActiveSoloSession(req, res) {
  try {
    const session = await Session.findOne({
      user: req.user.id,
      room: null,
      isCompleted: false,
    }).sort({ startTime: -1 });

    if (!session) return res.status(204).end();
    res.status(200).json(session);
  } catch (error) {
    console.error("Error in getActiveSoloSession controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Everyone currently working that this user shares a room, team or friendship
 * with. Presence is the core co-working signal — the dashboard leads with it,
 * so it is one query rather than something the client stitches together.
 */
export async function getLivePresence(req, res) {
  try {
    const [Team, Room, User] = await Promise.all([
      import("../models/Team.model.js").then((m) => m.default),
      import("../models/Room.model.js").then((m) => m.default),
      import("../models/User.model.js").then((m) => m.default),
    ]);

    const [teams, rooms, me] = await Promise.all([
      Team.find({ "members.user": req.user.id }).select("name members.user"),
      Room.find({ members: req.user.id, isActive: true }).select("name members team"),
      User.findById(req.user.id).select("friends"),
    ]);

    const peers = new Set();
    for (const t of teams) t.members.forEach((m) => peers.add(String(m.user)));
    for (const r of rooms) r.members.forEach((m) => peers.add(String(m)));
    (me?.friends ?? []).forEach((f) => peers.add(String(f)));
    peers.delete(String(req.user.id));

    if (peers.size === 0) return res.status(200).json([]);

    const live = await Session.find({
      user: { $in: [...peers] },
      isCompleted: false,
    })
      .populate("user", "fullName profilePic role")
      .populate("room", "name")
      .sort({ startTime: -1 })
      .limit(24);

    // Where we know this person from, so the UI can label the connection.
    const teamNameByUser = new Map();
    for (const t of teams) {
      for (const m of t.members) {
        if (!teamNameByUser.has(String(m.user))) {
          teamNameByUser.set(String(m.user), t.name);
        }
      }
    }

    res.status(200).json(
      live.map((s) => ({
        _id: s._id,
        workTopic: s.workTopic,
        startTime: s.startTime,
        targetDuration: s.targetDuration,
        breaks: s.breaks,
        user: s.user,
        room: s.room,
        via: teamNameByUser.get(String(s.user?._id)) ?? null,
      }))
    );
  } catch (error) {
    console.error("Error in getLivePresence controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// Loads a session the caller owns and has not yet closed.
async function findLiveSession(req) {
  const session = await Session.findOne({
    _id: req.params.sessionId,
    user: req.user.id,
    isCompleted: false,
  });
  return session;
}

export async function startBreak(req, res) {
  try {
    const session = await findLiveSession(req);
    if (!session) {
      return res.status(404).json({ message: "No active session" });
    }

    const open = session.breaks.find((b) => !b.endedAt);
    if (open) {
      return res.status(400).json({ message: "You're already on a break" });
    }

    session.breaks.push({ startedAt: new Date() });
    session.lastSeenAt = new Date();
    await session.save();

    res.status(200).json(session);
  } catch (error) {
    console.error("Error in startBreak controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function endBreak(req, res) {
  try {
    const session = await findLiveSession(req);
    if (!session) {
      return res.status(404).json({ message: "No active session" });
    }

    const open = session.breaks.find((b) => !b.endedAt);
    if (!open) {
      return res.status(400).json({ message: "You're not on a break" });
    }

    open.endedAt = new Date();
    session.lastSeenAt = new Date();
    await session.save();

    res.status(200).json(session);
  } catch (error) {
    console.error("Error in endBreak controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function extendSession(req, res) {
  try {
    const minutes = Number(req.body?.minutes);
    if (![5, 10, 15, 25, 30].includes(minutes)) {
      return res.status(400).json({ message: "Pick 5, 10, 15, 25 or 30 minutes" });
    }

    const session = await findLiveSession(req);
    if (!session) {
      return res.status(404).json({ message: "No active session" });
    }

    // Keep the ceiling meaningful: extending is deliberate, drifting is not.
    if (session.targetDuration + minutes > 480) {
      return res
        .status(400)
        .json({ message: "A session can't run longer than 8 hours" });
    }

    session.targetDuration += minutes;
    session.lastSeenAt = new Date();
    await session.save();

    res.status(200).json(session);
  } catch (error) {
    console.error("Error in extendSession controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function deleteSessionTask(req, res) {
  try {
    const session = await findLiveSession(req);
    if (!session) {
      return res.status(404).json({ message: "No active session" });
    }

    const task = session.tasks.id(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    task.deleteOne();
    await session.save();

    res.status(200).json(session);
  } catch (error) {
    console.error("Error in deleteSessionTask controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function completeSession(req, res) {
  try {
    const session = await Session.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }
    if (session.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not your session" });
    }

    // Close any break still open, so its time isn't counted as work.
    const open = session.breaks?.find((b) => !b.endedAt);
    if (open) open.endedAt = new Date();

    if (typeof req.body?.reflection === "string") {
      session.reflection = req.body.reflection.trim().slice(0, 500);
    }

    await closeSession(session);
    res.status(200).json(session);
  } catch (error) {
    console.error("Error in completeSession controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// Keeps a session alive. Without this, closing a tab leaves the row open forever
// and its duration grows until someone finally calls leave.
export async function heartbeatSession(req, res) {
  try {
    const result = await Session.updateOne(
      { _id: req.params.sessionId, user: req.user.id, isCompleted: false },
      { $set: { lastSeenAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "No active session" });
    }
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Error in heartbeatSession controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// Exposed so an external scheduler can drive the sweep on serverless, where a
// long-lived interval would not survive between invocations.
export async function runSessionSweep(req, res) {
  try {
    const closed = await sweepAbandonedSessions();
    res.status(200).json({ closed });
  } catch (error) {
    console.error("Error in runSessionSweep controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getCurrentSession(req, res) {
  try {
    const { roomId } = req.params;
    const { userId } = req.query;
    const requestUserId = userId || req.user.id;

    const session = await Session.findOne({
      user: requestUserId,
      room: roomId,
      isCompleted: false,
    }).sort({ startTime: -1 }).populate("encouragements.user", "fullName profilePic");

    if (!session) {
      return res.status(404).json({ message: "No active session found" });
    }

    res.status(200).json(session);
  } catch (error) {
    console.error("Error in getCurrentSession controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function updateSessionTask(req, res) {
  try {
    const { sessionId, taskId } = req.params;
    const { isCompleted } = req.body;
    const userId = req.user.id;

    const session = await Session.findOne({
      _id: sessionId,
      user: userId,
    });

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const task = session.tasks.id(taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    task.isCompleted = isCompleted;
    if (isCompleted) {
      task.completedAt = new Date();
    } else {
      task.completedAt = null;
    }

    await session.save();

    res.status(200).json(session);
  } catch (error) {
    console.error("Error in updateSessionTask controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function addSessionTask(req, res) {
  try {
    const { sessionId } = req.params;
    const { title } = req.body;
    const userId = req.user.id;

    if (!title || title.trim() === "") {
      return res.status(400).json({ message: "Task title is required" });
    }

    const session = await Session.findOne({
      _id: sessionId,
      user: userId,
      isCompleted: false,
    });

    if (!session) {
      return res.status(404).json({ message: "Active session not found" });
    }

    session.tasks.push({
      title: title.trim(),
      isCompleted: false,
    });

    await session.save();

    res.status(200).json(session);
  } catch (error) {
    console.error("Error in addSessionTask controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getUserSessions(req, res) {
  try {
    const { userId } = req.params;
    const requesterId = req.user.id;

    if (userId === requesterId) {
      const sessions = await Session.find({ user: userId })
        .populate("room", "name skill")
        .populate("user", "fullName profilePic")
        .sort({ startTime: -1 })
        .limit(50);

      return res.status(200).json(sessions);
    }

    const User = (await import("../models/User.model.js")).default;
    const targetUser = await User.findById(userId).select("friends");

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const isFriend = targetUser.friends.some(
      (friendId) => friendId.toString() === requesterId
    );

    if (!isFriend) {
      return res.status(403).json({
        message: "You must be friends with this user to view their sessions",
      });
    }

    const sessions = await Session.find({ user: userId })
      .populate("room", "name skill")
      .populate("user", "fullName profilePic")
      .sort({ startTime: -1 })
      .limit(50);

    res.status(200).json(sessions);
  } catch (error) {
    console.error("Error in getUserSessions controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getRoomSessionStats(req, res) {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const sessions = await Session.find({
      room: roomId,
      isCompleted: true,
    }).populate("user", "fullName profilePic");

    const totalSessions = sessions.length;
    const totalMinutes = sessions.reduce(
      (sum, session) => sum + session.actualDuration,
      0
    );
    const totalHours = totalMinutes / 60;

    const avgDuration =
      totalSessions > 0 ? totalMinutes / totalSessions : 0;

    let totalTasks = 0;
    let completedTasks = 0;

    sessions.forEach((session) => {
      totalTasks += session.tasks.length;
      completedTasks += session.tasks.filter((t) => t.isCompleted).length;
    });

    const taskCompletionRate =
      totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const targetMetSessions = sessions.filter(
      (session) => session.actualDuration >= session.targetDuration
    ).length;
    const sessionCompletionRate =
      totalSessions > 0 ? (targetMetSessions / totalSessions) * 100 : 0;

    const uniqueParticipants = new Set(
      sessions.map((s) => s.user._id.toString())
    ).size;

    const recentSessions = sessions.slice(0, 10).map((session) => ({
      _id: session._id,
      user: session.user,
      workTopic: session.workTopic,
      targetDuration: session.targetDuration,
      actualDuration: session.actualDuration,
      startTime: session.startTime,
      endTime: session.endTime,
      tasksCompleted: session.tasks.filter((t) => t.isCompleted).length,
      totalTasks: session.tasks.length,
    }));

    res.status(200).json({
      totalSessions,
      totalHours: parseFloat(totalHours.toFixed(2)),
      avgDuration: parseFloat(avgDuration.toFixed(2)),
      taskCompletionRate: parseFloat(taskCompletionRate.toFixed(2)),
      sessionCompletionRate: parseFloat(sessionCompletionRate.toFixed(2)),
      uniqueParticipants,
      recentSessions,
    });
  } catch (error) {
    console.error("Error in getRoomSessionStats controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function encourageParticipant(req, res) {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const session = await Session.findById(sessionId).populate("user", "fullName profilePic");
    
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const alreadyEncouraged = session.encouragements.some(
      (e) => e.user.toString() === userId
    );

    if (alreadyEncouraged) {
      return res.status(400).json({ message: "You've already encouraged this participant" });
    }

    session.encouragements.push({ user: userId });
    await session.save();

    if (session.user._id.toString() !== userId) {
      await Notification.create({
        recipient: session.user._id,
        sender: userId,
        type: "encouragement",
        message: "encouraged you during your session!",
        metadata: {
          sessionId: session._id,
          workTopic: session.workTopic,
        },
      });
    }

    res.status(200).json({ 
      message: "Encouragement sent!",
      encouragementCount: session.encouragements.length
    });
  } catch (error) {
    console.error("Error in encourageParticipant controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function removeEncouragement(req, res) {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const session = await Session.findById(sessionId).populate("user", "fullName profilePic");

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const encouragementIndex = session.encouragements.findIndex(
      (e) => e.user.toString() === userId
    );

    if (encouragementIndex === -1) {
      return res.status(400).json({ message: "You haven't encouraged this participant" });
    }

    session.encouragements.splice(encouragementIndex, 1);
    await session.save();

    await Notification.findOneAndDelete({
      recipient: session.user._id,
      sender: userId,
      type: "encouragement",
      "metadata.sessionId": session._id,
    });

    res.status(200).json({ 
      message: "Encouragement removed",
      encouragementCount: session.encouragements.length
    });
  } catch (error) {
    console.error("Error in removeEncouragement controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
