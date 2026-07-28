import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      validate: {
        // Enforced on creation only. Mongoose validates the whole document on
        // every save(), so a blanket minLength would make every pre-existing
        // room with a short description permanently unsaveable — breaking
        // joins, announcements and stream join/leave on all of them.
        validator: function (value) {
          if (!this.isNew) return true;
          return typeof value === "string" && value.trim().length >= 30;
        },
        message:
          "Describe the room in at least 30 characters so people know what they're joining",
      },
    },
    // "open" lets anyone join instantly. Approval is opt-in, not the default:
    // gating every room behind a stranger's approval made the core loop
    // unreachable for new users.
    joinPolicy: {
      type: String,
      enum: ["open", "approval"],
      default: "open",
    },
    // Set when the room belongs to a team. Team rooms are visible and joinable
    // only to that team's members; public rooms leave this null.
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      default: null,
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
    streamInitialized: {
      type: Boolean,
      default: false,
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
        startedAt: Date,
        endedAt: Date,
        participants: [
          {
            user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            joinedAt: Date,
            leftAt: Date,
            totalMinutes: { type: Number, default: 0 },
          },
        ],
        stats: {
          totalParticipants: { type: Number, default: 0 },
          totalHoursWorked: { type: Number, default: 0 },
          actualDuration: { type: Number, default: 0 }, // in minutes
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
    activeStreams: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        workTopic: { type: String, required: true },
        startedAt: { type: Date, default: Date.now },
        sessionId: { type: mongoose.Schema.Types.ObjectId }, // link to active session
        isVideoEnabled: { type: Boolean, default: false },
        isAudioEnabled: { type: Boolean, default: false },
      },
    ],
    activeSessionId: {
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  { timestamps: true }
);

const Room = mongoose.model("Room", roomSchema);

export default Room;
