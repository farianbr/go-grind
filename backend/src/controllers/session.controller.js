import Session from "../models/Session.model.js";
import Space from "../models/Space.model.js";

// Get current active session for a user in a space
export async function getCurrentSession(req, res) {
  try {
    const { spaceId } = req.params;
    const userId = req.user.id;

    const session = await Session.findOne({
      user: userId,
      space: spaceId,
      isCompleted: false,
    }).sort({ startTime: -1 });

    if (!session) {
      return res.status(404).json({ message: "No active session found" });
    }

    res.status(200).json(session);
  } catch (error) {
    console.error("Error in getCurrentSession controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// Update task completion status
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

// Add a new task to an active session
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
      isCompleted: false, // Only allow adding tasks to active sessions
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

// Get user's sessions
export async function getUserSessions(req, res) {
  try {
    const { userId } = req.params;
    const requesterId = req.user.id;

    // Allow viewing own sessions
    if (userId === requesterId) {
      const sessions = await Session.find({ user: userId })
        .populate("space", "name skill")
        .sort({ startTime: -1 })
        .limit(50); // Limit to recent 50 sessions

      return res.status(200).json(sessions);
    }

    // Check if requester is a friend of the user
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

    // Return sessions for friend
    const sessions = await Session.find({ user: userId })
      .populate("space", "name skill")
      .sort({ startTime: -1 })
      .limit(50); // Limit to recent 50 sessions

    res.status(200).json(sessions);
  } catch (error) {
    console.error("Error in getUserSessions controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// Get session statistics for a space
export async function getSpaceSessionStats(req, res) {
  try {
    const { spaceId } = req.params;
    const userId = req.user.id;

    const space = await Space.findById(spaceId);

    if (!space) {
      return res.status(404).json({ message: "Space not found" });
    }

    // Check if user is a member
    if (
      !space.members.includes(userId) &&
      space.creator.toString() !== userId
    ) {
      return res
        .status(403)
        .json({ message: "Only members can view statistics" });
    }

    // Get all completed sessions for this space
    const sessions = await Session.find({
      space: spaceId,
      isCompleted: true,
    }).populate("user", "fullName profilePic");

    // Calculate statistics
    const totalSessions = sessions.length;
    const totalMinutes = sessions.reduce(
      (sum, session) => sum + session.actualDuration,
      0
    );
    const totalHours = totalMinutes / 60;

    const avgDuration =
      totalSessions > 0 ? totalMinutes / totalSessions : 0;

    // Task completion rate
    let totalTasks = 0;
    let completedTasks = 0;

    sessions.forEach((session) => {
      totalTasks += session.tasks.length;
      completedTasks += session.tasks.filter((t) => t.isCompleted).length;
    });

    const taskCompletionRate =
      totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Session completion rate (met target duration)
    const targetMetSessions = sessions.filter(
      (session) => session.actualDuration >= session.targetDuration
    ).length;
    const sessionCompletionRate =
      totalSessions > 0 ? (targetMetSessions / totalSessions) * 100 : 0;

    // Get unique participants
    const uniqueParticipants = new Set(
      sessions.map((s) => s.user._id.toString())
    ).size;

    // Recent sessions (last 10)
    const recentSessions = sessions.slice(0, 10).map((session) => ({
      _id: session._id,
      user: session.user,
      grindingTopic: session.grindingTopic,
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
    console.error("Error in getSpaceSessionStats controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
