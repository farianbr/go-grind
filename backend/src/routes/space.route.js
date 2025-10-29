import express from "express";
import {
  createSpace,
  getAllSpaces,
  getMySpaces,
  getSpaceById,
  requestToJoinSpace,
  approveJoinRequest,
  rejectJoinRequest,
  leaveSpace,
  deleteSpace,
  createSession,
  updateSessionStatus,
  createAnnouncement,
  deleteAnnouncement,
  joinStream,
  leaveStream,
  updateGrindingTopic,
  removeFromStream,
  toggleStreamMedia,
} from "../controllers/space.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(protectRoute);

router.post("/", createSpace);
router.get("/", getAllSpaces);
router.get("/my-spaces", getMySpaces);
router.get("/:id", getSpaceById);
router.post("/:id/request-join", requestToJoinSpace);
router.post("/:id/approve", approveJoinRequest);
router.post("/:id/reject", rejectJoinRequest);
router.delete("/:id/leave", leaveSpace);
router.delete("/:id", deleteSpace);

// Sessions
router.post("/:id/sessions", createSession);
router.patch("/:id/sessions/:sessionId", updateSessionStatus);

// Announcements
router.post("/:id/announcements", createAnnouncement);
router.delete("/:id/announcements/:announcementId", deleteAnnouncement);

// Streams
router.post("/:id/streams/join", joinStream);
router.delete("/:id/streams/leave", leaveStream);
router.patch("/:id/streams/topic", updateGrindingTopic);
router.patch("/:id/streams/media", toggleStreamMedia);
router.delete("/:id/streams/:userId", removeFromStream);

export default router;
