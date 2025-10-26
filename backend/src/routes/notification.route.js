import express from "express";
import { protectRoute } from "../middlewares/auth.middleware.js";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "../controllers/notification.controller.js";

const router = express.Router();

router.get("/", protectRoute, getNotifications);
router.get("/unread-count", protectRoute, getUnreadCount);
router.patch("/:id/read", protectRoute, markAsRead);
router.patch("/read-all", protectRoute, markAllAsRead);
router.delete("/:id", protectRoute, deleteNotification);

export default router;
