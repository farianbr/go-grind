import Notification from "../models/Notification.model.js";

// Get all notifications for the authenticated user
export const getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({
      recipient: req.user._id,
    })
      .populate("sender", "fullName profilePic")
      .populate("relatedSpace", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments({
      recipient: req.user._id,
    });

    res.status(200).json({
      notifications,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalNotifications: total,
      hasMore: skip + notifications.length < total,
    });
  } catch (error) {
    console.error("Error in getNotifications controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get unread count
export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      read: false,
    });

    res.status(200).json({ count });
  } catch (error) {
    console.error("Error in getUnreadCount controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: req.user._id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json(notification);
  } catch (error) {
    console.error("Error in markAsRead controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true }
    );

    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Error in markAllAsRead controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete a notification
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      recipient: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json({ message: "Notification deleted" });
  } catch (error) {
    console.error("Error in deleteNotification controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Helper function to create notifications (exported for use in other controllers)
export const createNotification = async ({
  recipient,
  sender,
  type,
  message,
  relatedSpace = null,
  relatedSession = null,
  metadata = {},
}) => {
  try {
    const notification = await Notification.create({
      recipient,
      sender,
      type,
      message,
      relatedSpace,
      relatedSession,
      metadata,
    });

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};
