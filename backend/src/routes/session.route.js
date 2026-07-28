import express from "express";
import { protectRoute } from "../middlewares/auth.middleware.js";
import {
  getCurrentSession,
  updateSessionTask,
  addSessionTask,
  getUserSessions,
  getRoomSessionStats,
  encourageParticipant,
  removeEncouragement,
  startSoloSession,
  getActiveSoloSession,
  completeSession,
  heartbeatSession,
  runSessionSweep,
  getLivePresence,
  startBreak,
  endBreak,
  extendSession,
  deleteSessionTask,
} from "../controllers/session.controller.js";

const router = express.Router();

router.use(protectRoute);

router.post("/solo", startSoloSession);
router.get("/solo/active", getActiveSoloSession);
router.get("/live", getLivePresence);
router.post("/:sessionId/complete", completeSession);
router.post("/:sessionId/break/start", startBreak);
router.post("/:sessionId/break/end", endBreak);
router.patch("/:sessionId/extend", extendSession);
router.delete("/:sessionId/tasks/:taskId", deleteSessionTask);
router.post("/:sessionId/heartbeat", heartbeatSession);
router.post("/sweep", runSessionSweep);

router.get("/current/:roomId", getCurrentSession);

router.patch("/:sessionId/tasks/:taskId", updateSessionTask);

router.post("/:sessionId/tasks", addSessionTask);

router.get("/user/:userId", getUserSessions);

router.get("/room/:roomId/stats", getRoomSessionStats);

router.post("/:sessionId/encourage", encourageParticipant);

router.delete("/:sessionId/encourage", removeEncouragement);

export default router;
