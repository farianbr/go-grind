import express from "express";
import {
  createRoom,
  getAllRooms,
  getMyRooms,
  getRoomById,
  requestToJoinRoom,
  approveJoinRequest,
  rejectJoinRequest,
  leaveRoom,
  deleteRoom,
  createAnnouncement,
  deleteAnnouncement,
  joinStream,
  leaveStream,
  removeFromStream,
} from "../controllers/room.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(protectRoute);

router.post("/", createRoom);
router.get("/", getAllRooms);
router.get("/my-rooms", getMyRooms);
router.get("/:id", getRoomById);
router.post("/:id/request-join", requestToJoinRoom);
router.post("/:id/approve", approveJoinRequest);
router.post("/:id/reject", rejectJoinRequest);
router.delete("/:id/leave", leaveRoom);
router.delete("/:id", deleteRoom);

router.post("/:id/announcements", createAnnouncement);
router.delete("/:id/announcements/:announcementId", deleteAnnouncement);

router.post("/:id/streams/join", joinStream);
router.delete("/:id/streams/leave", leaveStream);
router.delete("/:id/streams/:userId", removeFromStream);

export default router;
