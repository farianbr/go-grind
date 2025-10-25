import mongoose from "mongoose";

const spaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    skill: {
      type: String,
      required: true,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    pendingRequests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    maxMembers: {
      type: Number,
      default: 10,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    streamChannelId: {
      type: String,
      default: "",
    },
    sessions: [
      {
        title: { type: String, required: true },
        description: String,
        scheduledAt: { type: Date, required: true },
        duration: { type: Number, default: 60 }, // in minutes
        host: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        streamUrl: String,
        status: {
          type: String,
          enum: ["scheduled", "live", "completed", "cancelled"],
          default: "scheduled",
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    announcements: [
      {
        title: { type: String, required: true },
        content: { type: String, required: true },
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const Space = mongoose.model("Space", spaceSchema);

export default Space;
