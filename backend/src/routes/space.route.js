import express from "express";
import {
  createSpace,
  getAllSpaces,
  getMySpaces,
  getSpaceById,
  requestToJoinSpace,
  approveJoinRequest,
  rejectJoinRequest,
  leaveSpace,
  deleteSpace,
} from "../controllers/space.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(protectRoute);

router.post("/", createSpace);
router.get("/", getAllSpaces);
router.get("/my-spaces", getMySpaces);
router.get("/:id", getSpaceById);
router.post("/:id/request-join", requestToJoinSpace);
router.post("/:id/approve", approveJoinRequest);
router.post("/:id/reject", rejectJoinRequest);
router.delete("/:id/leave", leaveSpace);
router.delete("/:id", deleteSpace);

export default router;
