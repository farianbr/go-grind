import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Null for solo sessions, which deliberately belong to no room so a new
    // user can focus without joining or being approved into anything.
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      default: null,
    },
    workTopic: {
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
    // True when the session was closed by the sweeper or overran its ceiling,
    // i.e. the duration is a guess rather than an observed value. Excluded from
    // aggregate stats so one dropped connection can't distort the numbers.
    abandoned: {
      type: Boolean,
      default: false,
    },
    // Refreshed by the stream page heartbeat; drives abandonment detection.
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
    // Breaks are subtracted from the clock, so "45 minutes of work" means 45
    // minutes of work rather than 45 minutes of the timer being open.
    breaks: [
      {
        startedAt: { type: Date, required: true },
        endedAt: { type: Date },
      },
    ],
    // Written on finish. The prompt is what makes the next session easier to
    // start, so it is kept with the session rather than in a separate note.
    reflection: {
      type: String,
      trim: true,
      maxLength: 500,
      default: "",
    },
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
    mediaUsage: {
      videoEnabled: { type: Boolean, default: false },
      audioEnabled: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

sessionSchema.index({ user: 1, room: 1 });
sessionSchema.index({ room: 1, endTime: -1 });
sessionSchema.index({ user: 1, endTime: -1 });

const Session = mongoose.model("Session", sessionSchema);

export default Session;
