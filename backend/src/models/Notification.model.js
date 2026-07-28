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
        "room_join_request",
        "room_join_approved",
        "room_join_rejected",
        "session_started",
        "session_reminder",
        "removed_from_stream",
        "announcement",
        "encouragement",
        "team_invite",
        "team_joined",
      ],
    },
    message: {
      type: String,
      required: true,
    },
    relatedRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
    },
    relatedSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room.sessions",
    },
    read: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
