import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    space: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Space",
      required: true,
    },
    grindingTopic: {
      type: String,
      required: true,
      trim: true,
    },
    targetDuration: {
      type: Number, // in minutes
      required: true,
      default: 60,
    },
    actualDuration: {
      type: Number, // in minutes
      default: 0,
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    tasks: [
      {
        title: {
          type: String,
          required: true,
          trim: true,
        },
        isCompleted: {
          type: Boolean,
          default: false,
        },
        completedAt: {
          type: Date,
        },
      },
    ],
    isCompleted: {
      type: Boolean,
      default: false,
    },
    // Track encouragements from other users
    encouragements: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Optional: track video/audio usage during session
    mediaUsage: {
      videoEnabled: { type: Boolean, default: false },
      audioEnabled: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

// Index for faster queries
sessionSchema.index({ user: 1, space: 1 });
sessionSchema.index({ space: 1, endTime: -1 });
sessionSchema.index({ user: 1, endTime: -1 });

const Session = mongoose.model("Session", sessionSchema);

export default Session;
