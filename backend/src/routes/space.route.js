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
  createAnnouncement,
  deleteAnnouncement,
  joinStream,
  leaveStream,
  removeFromStream,
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

router.post("/:id/announcements", createAnnouncement);
router.delete("/:id/announcements/:announcementId", deleteAnnouncement);

router.post("/:id/streams/join", joinStream);
router.delete("/:id/streams/leave", leaveStream);
router.delete("/:id/streams/:userId", removeFromStream);

export default router;
