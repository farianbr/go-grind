import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "friend_request",
        "friend_request_accepted",
        "space_join_request",
        "space_join_approved",
        "space_join_rejected",
        "session_started",
        "session_reminder",
        "removed_from_stream",
      ],
    },
    message: {
      type: String,
      required: true,
    },
    // Reference to related entities
    relatedSpace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Space",
    },
    relatedSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Space.sessions",
    },
    read: {
      type: Boolean,
      default: false,
    },
    // Additional data for different notification types
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
