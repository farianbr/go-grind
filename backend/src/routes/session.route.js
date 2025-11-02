import express from "express";
import { protectRoute } from "../middlewares/auth.middleware.js";
import {
  getCurrentSession,
  updateSessionTask,
  addSessionTask,
  getUserSessions,
  getSpaceSessionStats,
  encourageParticipant,
  removeEncouragement,
} from "../controllers/session.controller.js";

const router = express.Router();

router.use(protectRoute);

// Get current active session for user in a space
router.get("/current/:spaceId", getCurrentSession);

// Update task completion status
router.patch("/:sessionId/tasks/:taskId", updateSessionTask);

// Add new task to session
router.post("/:sessionId/tasks", addSessionTask);

// Get user's sessions
router.get("/user/:userId", getUserSessions);

// Get space session statistics
router.get("/space/:spaceId/stats", getSpaceSessionStats);

// Encourage a participant
router.post("/:sessionId/encourage", encourageParticipant);

// Remove encouragement
router.delete("/:sessionId/encourage", removeEncouragement);

export default router;
