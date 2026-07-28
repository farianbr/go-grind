import express from "express";
import { protectRoute } from "../middlewares/auth.middleware.js";
import {
  createTeam,
  getMyTeams,
  getTeamById,
  inviteToTeam,
  revokeInvite,
  acceptInvite,
  getPendingInvites,
  updateMemberRole,
  removeMember,
  deleteTeam,
  upgradePlan,
} from "../controllers/team.controller.js";

const router = express.Router();

router.use(protectRoute);

// Literal paths before "/:id" so they are not swallowed by the param route.
router.get("/invites/pending", getPendingInvites);
router.post("/invites/accept", acceptInvite);
router.post("/upgrade", upgradePlan);

router.post("/", createTeam);
router.get("/", getMyTeams);
router.get("/:id", getTeamById);
router.delete("/:id", deleteTeam);

router.post("/:id/invites", inviteToTeam);
router.delete("/:id/invites/:token", revokeInvite);
router.patch("/:id/members/:userId", updateMemberRole);
router.delete("/:id/members/:userId", removeMember);

export default router;
