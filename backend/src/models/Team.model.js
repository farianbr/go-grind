import mongoose from "mongoose";
import crypto from "crypto";

/**
 * A team or company. Rooms can belong to one, which is what turns Kendro from
 * "somewhere I work" into "somewhere my company works".
 *
 * Creating a team is gated behind a paid plan (see User.plan); joining one is
 * always free, so an invited member never hits a paywall.
 */
const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minLength: [2, "Give the team a name"],
      maxLength: 60,
    },
    description: {
      type: String,
      trim: true,
      maxLength: 300,
      default: "",
    },
    kind: {
      type: String,
      enum: ["company", "team", "group"],
      default: "team",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        // owner: billing and deletion. admin: manage members and rooms.
        // member: work here.
        role: {
          type: String,
          enum: ["owner", "admin", "member"],
          default: "member",
        },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    // Pending email invites. Kept on the team so an invite survives the invitee
    // not having an account yet.
    invites: [
      {
        email: { type: String, required: true, lowercase: true, trim: true },
        role: { type: String, enum: ["admin", "member"], default: "member" },
        token: { type: String, required: true },
        invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

teamSchema.index({ "members.user": 1 });
teamSchema.index({ "invites.token": 1 });

teamSchema.statics.newInviteToken = () =>
  crypto.randomBytes(24).toString("hex");

teamSchema.methods.roleOf = function (userId) {
  const entry = this.members.find(
    (m) => String(m.user?._id ?? m.user) === String(userId)
  );
  return entry?.role ?? null;
};

teamSchema.methods.canManage = function (userId) {
  const role = this.roleOf(userId);
  return role === "owner" || role === "admin";
};

const Team = mongoose.model("Team", teamSchema);

export default Team;
