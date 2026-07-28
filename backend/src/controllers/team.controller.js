import Team from "../models/Team.model.js";
import User from "../models/User.model.js";
import Room from "../models/Room.model.js";
import Session from "../models/Session.model.js";
import { createNotification } from "./notification.controller.js";
import { sendTeamInviteEmail } from "../lib/mail.js";
import { deleteGroupChannel, teamChannelId } from "../lib/stream.js";

const MEMBER_FIELDS = "fullName profilePic role email";

async function loadTeam(id) {
  return Team.findById(id)
    .populate("owner", MEMBER_FIELDS)
    .populate("members.user", MEMBER_FIELDS);
}

export async function createTeam(req, res) {
  try {
    const { name, description, kind } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Give the team a name" });
    }

    // The paywall lives here and only here: creating is paid, joining is free.
    const owner = await User.findById(req.user.id).select("plan");
    if (owner?.plan !== "pro") {
      return res.status(402).json({
        message: "Creating a team is part of Kendro Pro",
        upgradeRequired: true,
      });
    }

    const team = await Team.create({
      name: name.trim(),
      description: (description || "").trim(),
      kind: ["company", "team", "group"].includes(kind) ? kind : "team",
      owner: req.user.id,
      members: [{ user: req.user.id, role: "owner" }],
    });

    res.status(201).json(await loadTeam(team._id));
  } catch (error) {
    console.error("Error in createTeam controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getMyTeams(req, res) {
  try {
    const teams = await Team.find({
      "members.user": req.user.id,
      isActive: true,
    })
      .populate("members.user", MEMBER_FIELDS)
      .sort({ createdAt: -1 });

    // Member and room counts are what the list screen actually shows.
    const withCounts = await Promise.all(
      teams.map(async (t) => ({
        ...t.toObject(),
        roomCount: await Room.countDocuments({ team: t._id, isActive: true }),
        myRole: t.roleOf(req.user.id),
      }))
    );

    res.status(200).json(withCounts);
  } catch (error) {
    console.error("Error in getMyTeams controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getTeamById(req, res) {
  try {
    const team = await loadTeam(req.params.id);
    if (!team) return res.status(404).json({ message: "Team not found" });

    if (!team.roleOf(req.user.id)) {
      return res.status(403).json({ message: "You are not in this team" });
    }

    const memberIds = team.members.map((m) => m.user?._id ?? m.user);

    const [rooms, liveSessions] = await Promise.all([
      Room.find({ team: team._id, isActive: true })
        .populate("members", "fullName profilePic")
        .sort({ createdAt: -1 }),
      Session.find({ user: { $in: memberIds }, isCompleted: false })
        .populate("user", "fullName profilePic")
        .sort({ startTime: -1 }),
    ]);

    // Last 7 days of finished work, for the one number a manager actually wants.
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekly = await Session.aggregate([
      {
        $match: {
          user: { $in: memberIds },
          isCompleted: true,
          abandoned: { $ne: true },
          startTime: { $gte: since },
        },
      },
      {
        $group: {
          _id: "$user",
          minutes: { $sum: "$actualDuration" },
          sessions: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      ...team.toObject(),
      myRole: team.roleOf(req.user.id),
      rooms,
      liveSessions,
      weekly,
    });
  } catch (error) {
    console.error("Error in getTeamById controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function inviteToTeam(req, res) {
  try {
    const { email, role } = req.body;
    const team = await Team.findById(req.params.id);

    if (!team) return res.status(404).json({ message: "Team not found" });
    if (!team.canManage(req.user.id)) {
      return res
        .status(403)
        .json({ message: "Only owners and admins can invite people" });
    }

    const clean = (email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }

    const existingUser = await User.findOne({ email: clean });
    if (existingUser && team.roleOf(existingUser._id)) {
      return res.status(400).json({ message: "They are already in this team" });
    }
    if (team.invites.some((i) => i.email === clean)) {
      return res.status(400).json({ message: "They already have an invite" });
    }

    const token = Team.newInviteToken();
    team.invites.push({
      email: clean,
      role: role === "admin" ? "admin" : "member",
      token,
      invitedBy: req.user.id,
    });
    await team.save();

    // If they already have an account, tell them in-app straight away.
    if (existingUser) {
      await createNotification({
        recipient: existingUser._id,
        sender: req.user.id,
        type: "team_invite",
        message: `${req.user.fullName} invited you to join ${team.name}`,
      });
    }

    const mail = await sendTeamInviteEmail({
      to: clean,
      teamName: team.name,
      inviterName: req.user.fullName,
      token,
      role: role === "admin" ? "admin" : "member",
      hasAccount: Boolean(existingUser),
    });

    res.status(200).json({
      message: mail.sent
        ? `Invite emailed to ${clean}`
        : `Invite created for ${clean}. Share the link so they can join.`,
      token,
      emailed: mail.sent,
      hasAccount: Boolean(existingUser),
    });
  } catch (error) {
    console.error("Error in inviteToTeam controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function revokeInvite(req, res) {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: "Team not found" });
    if (!team.canManage(req.user.id)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    team.invites = team.invites.filter((i) => i.token !== req.params.token);
    await team.save();

    res.status(200).json(await loadTeam(team._id));
  } catch (error) {
    console.error("Error in revokeInvite controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// Accepting is free and works whether the invite was aimed at an existing
// account or an email that had not signed up yet.
export async function acceptInvite(req, res) {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Invite link is missing its code" });

    const team = await Team.findOne({ "invites.token": token });
    if (!team) {
      return res
        .status(404)
        .json({ message: "That invite has expired or was withdrawn" });
    }

    const invite = team.invites.find((i) => i.token === token);
    const me = await User.findById(req.user.id).select("email fullName");

    if (invite.email !== me.email.toLowerCase()) {
      return res.status(403).json({
        message: `This invite was sent to ${invite.email}. Sign in with that address to accept it.`,
      });
    }

    if (!team.roleOf(me._id)) {
      team.members.push({ user: me._id, role: invite.role });
    }
    team.invites = team.invites.filter((i) => i.token !== token);
    await team.save();

    await createNotification({
      recipient: team.owner,
      sender: me._id,
      type: "team_joined",
      message: `${me.fullName} joined ${team.name}`,
    });

    res.status(200).json(await loadTeam(team._id));
  } catch (error) {
    console.error("Error in acceptInvite controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getPendingInvites(req, res) {
  try {
    const me = await User.findById(req.user.id).select("email");
    const teams = await Team.find({ "invites.email": me.email.toLowerCase() })
      .select("name kind description invites owner")
      .populate("owner", "fullName profilePic");

    const invites = teams.map((t) => {
      const invite = t.invites.find((i) => i.email === me.email.toLowerCase());
      return {
        teamId: t._id,
        name: t.name,
        kind: t.kind,
        description: t.description,
        owner: t.owner,
        role: invite?.role,
        token: invite?.token,
      };
    });

    res.status(200).json(invites);
  } catch (error) {
    console.error("Error in getPendingInvites controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function updateMemberRole(req, res) {
  try {
    const { role } = req.body;
    const team = await Team.findById(req.params.id);

    if (!team) return res.status(404).json({ message: "Team not found" });
    if (team.roleOf(req.user.id) !== "owner") {
      return res.status(403).json({ message: "Only the owner can change roles" });
    }
    if (!["admin", "member"].includes(role)) {
      return res.status(400).json({ message: "Pick admin or member" });
    }
    if (String(team.owner) === req.params.userId) {
      return res.status(400).json({ message: "The owner's role can't be changed" });
    }

    const entry = team.members.find(
      (m) => String(m.user) === req.params.userId
    );
    if (!entry) return res.status(404).json({ message: "Not a member" });

    entry.role = role;
    await team.save();

    res.status(200).json(await loadTeam(team._id));
  } catch (error) {
    console.error("Error in updateMemberRole controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function removeMember(req, res) {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const isSelf = req.params.userId === req.user.id;
    if (!isSelf && !team.canManage(req.user.id)) {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (String(team.owner) === req.params.userId) {
      return res
        .status(400)
        .json({ message: "The owner can't be removed. Delete the team instead." });
    }

    team.members = team.members.filter(
      (m) => String(m.user) !== req.params.userId
    );
    await team.save();

    // Drop them from the team's rooms too, so access actually ends.
    await Room.updateMany(
      { team: team._id },
      { $pull: { members: req.params.userId, pendingRequests: req.params.userId } }
    );

    res.status(200).json(await loadTeam(team._id));
  } catch (error) {
    console.error("Error in removeMember controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function deleteTeam(req, res) {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: "Team not found" });
    if (team.roleOf(req.user.id) !== "owner") {
      return res.status(403).json({ message: "Only the owner can delete a team" });
    }

    // Team rooms become ordinary private rooms rather than vanishing with work
    // history attached to them.
    await Room.updateMany({ team: team._id }, { $set: { team: null } });
    await Team.deleteOne({ _id: team._id });
    await deleteGroupChannel(teamChannelId(team._id));

    res.status(200).json({ message: "Team deleted" });
  } catch (error) {
    console.error("Error in deleteTeam controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Placeholder for a real checkout. There is no payment provider wired up, so
 * this simply grants the plan — replace the body with a Stripe session when
 * billing is added, keeping the same route so the client does not change.
 */
export async function upgradePlan(req, res) {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { plan: "pro" },
      { new: true }
    );
    res.status(200).json({ plan: user.plan });
  } catch (error) {
    console.error("Error in upgradePlan controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
