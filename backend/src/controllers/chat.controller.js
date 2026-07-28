import { generateStreamToken, syncUserChannels } from "../lib/stream.js";
import Room from "../models/Room.model.js";
import Team from "../models/Team.model.js";

export async function getStreamToken(req, res) {
  try {
    const token = generateStreamToken(req.user.id);

    res.status(200).json({ token });
  } catch (error) {
    console.error("Error in getStreamToken controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Bring the caller's Stream channels in line with the rooms and teams they
 * actually belong to. The chat surface calls this on open, so a member sees a
 * conversation for every room and team they are in without anyone having to
 * remember to create one.
 */
export async function syncChannels(req, res) {
  try {
    const [rooms, teams] = await Promise.all([
      Room.find({ members: req.user.id, isActive: true }).select("name"),
      Team.find({ "members.user": req.user.id }).select("name"),
    ]);

    const result = await syncUserChannels({
      userId: req.user.id,
      rooms,
      teams,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in syncChannels controller:", error.message);
    // Chat still works with whatever channels already exist, so a sync failure
    // should degrade rather than blank the page.
    res.status(200).json({ synced: 0, removed: 0, failed: true });
  }
}
