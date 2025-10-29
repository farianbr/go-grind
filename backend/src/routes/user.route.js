import express from "express";
import multer from "multer";

import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  getFriendRequests,
  getMyFriends,
  getOutgoingFriendRequests,
  getRecommendedUsers,
  markNotificationsSeen,
  sendFriendRequest,
  unfriend,
  uploadPhoto,
  getUserProfile,
  getUserStatistics,
  getUserSpaces,
} from "../controllers/user.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); // handle file uploads in memory

router.use(protectRoute);

router.get("/", getRecommendedUsers);
router.get("/friends", getMyFriends);

router.post("/upload-photo", upload.single("image"), uploadPhoto);
router.post("/friend-request/:id", sendFriendRequest);
router.put("/friend-request/:id/accept", acceptFriendRequest);
router.delete("/friend-request/:id/decline", declineFriendRequest);
router.delete("/friend-request/:id/cancel", cancelFriendRequest);
router.delete("/unfriend/:id", unfriend);

router.get("/friend-requests", getFriendRequests);
router.get("/outgoing-friend-requests", getOutgoingFriendRequests);
router.put("/notifications/mark-seen", markNotificationsSeen);

router.get("/profile/:userId", getUserProfile);
router.get("/:userId/statistics", getUserStatistics);
router.get("/:userId/spaces", getUserSpaces);

export default router;
