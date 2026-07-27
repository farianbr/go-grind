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

router.get("/current/:spaceId", getCurrentSession);

router.patch("/:sessionId/tasks/:taskId", updateSessionTask);

router.post("/:sessionId/tasks", addSessionTask);

router.get("/user/:userId", getUserSessions);

router.get("/space/:spaceId/stats", getSpaceSessionStats);

router.post("/:sessionId/encourage", encourageParticipant);

router.delete("/:sessionId/encourage", removeEncouragement);

export default router;
