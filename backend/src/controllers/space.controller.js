import Space from "../models/Space.model.js";
import User from "../models/User.model.js";

export async function createSpace(req, res) {
  try {
    const { name, description, skill, maxMembers } = req.body;
    const creatorId = req.user.id;

    if (!name || !description || !skill) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const space = await Space.create({
      name,
      description,
      skill,
      creator: creatorId,
      members: [creatorId],
      maxMembers: maxMembers || 10,
    });

    const populatedSpace = await Space.findById(space._id).populate(
      "creator members",
      "fullName profilePic learningSkill"
    );

    res.status(201).json(populatedSpace);
  } catch (error) {
    console.error("Error in createSpace controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getAllSpaces(req, res) {
  try {
    const spaces = await Space.find({ isActive: true })
      .populate("creator members", "fullName profilePic learningSkill")
      .sort({ createdAt: -1 });

    res.status(200).json(spaces);
  } catch (error) {
    console.error("Error in getAllSpaces controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getMySpaces(req, res) {
  try {
    const userId = req.user.id;

    const spaces = await Space.find({
      $or: [{ creator: userId }, { members: userId }],
      isActive: true,
    })
      .populate("creator members", "fullName profilePic learningSkill")
      .sort({ createdAt: -1 });

    res.status(200).json(spaces);
  } catch (error) {
    console.error("Error in getMySpaces controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getSpaceById(req, res) {
  try {
    const { id } = req.params;

    const space = await Space.findById(id).populate(
      "creator members pendingRequests",
      "fullName profilePic learningSkill nativeLanguage"
    );

    if (!space) {
      return res.status(404).json({ message: "Space not found" });
    }

    res.status(200).json(space);
  } catch (error) {
    console.error("Error in getSpaceById controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function requestToJoinSpace(req, res) {
  try {
    const { id: spaceId } = req.params;
    const userId = req.user.id;

    const space = await Space.findById(spaceId);

    if (!space) {
      return res.status(404).json({ message: "Space not found" });
    }

    // Check if already a member
    if (space.members.includes(userId)) {
      return res
        .status(400)
        .json({ message: "You are already a member of this space" });
    }

    // Check if already requested
    if (space.pendingRequests.includes(userId)) {
      return res
        .status(400)
        .json({ message: "You have already requested to join" });
    }

    // Check if space is full
    if (space.members.length >= space.maxMembers) {
      return res.status(400).json({ message: "This space is full" });
    }

    space.pendingRequests.push(userId);
    await space.save();

    res.status(200).json({ message: "Join request sent successfully" });
  } catch (error) {
    console.error("Error in requestToJoinSpace controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function approveJoinRequest(req, res) {
  try {
    const { id: spaceId } = req.params;
    const { userId } = req.body;
    const requesterId = req.user.id;

    const space = await Space.findById(spaceId);

    if (!space) {
      return res.status(404).json({ message: "Space not found" });
    }

    // Only creator can approve
    if (space.creator.toString() !== requesterId) {
      return res
        .status(403)
        .json({ message: "Only the creator can approve requests" });
    }

    // Check if space is full
    if (space.members.length >= space.maxMembers) {
      return res.status(400).json({ message: "This space is full" });
    }

    // Remove from pending and add to members
    space.pendingRequests = space.pendingRequests.filter(
      (id) => id.toString() !== userId
    );
    space.members.push(userId);
    await space.save();

    res.status(200).json({ message: "User added to space successfully" });
  } catch (error) {
    console.error("Error in approveJoinRequest controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function rejectJoinRequest(req, res) {
  try {
    const { id: spaceId } = req.params;
    const { userId } = req.body;
    const requesterId = req.user.id;

    const space = await Space.findById(spaceId);

    if (!space) {
      return res.status(404).json({ message: "Space not found" });
    }

    // Only creator can reject
    if (space.creator.toString() !== requesterId) {
      return res
        .status(403)
        .json({ message: "Only the creator can reject requests" });
    }

    // Remove from pending requests
    space.pendingRequests = space.pendingRequests.filter(
      (id) => id.toString() !== userId
    );
    await space.save();

    res.status(200).json({ message: "Request rejected" });
  } catch (error) {
    console.error("Error in rejectJoinRequest controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function leaveSpace(req, res) {
  try {
    const { id: spaceId } = req.params;
    const userId = req.user.id;

    const space = await Space.findById(spaceId);

    if (!space) {
      return res.status(404).json({ message: "Space not found" });
    }

    // Creator cannot leave, must delete space
    if (space.creator.toString() === userId) {
      return res
        .status(400)
        .json({
          message: "Creator cannot leave. Delete the space instead.",
        });
    }

    // Remove user from members
    space.members = space.members.filter((id) => id.toString() !== userId);
    await space.save();

    res.status(200).json({ message: "Left space successfully" });
  } catch (error) {
    console.error("Error in leaveSpace controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function deleteSpace(req, res) {
  try {
    const { id: spaceId } = req.params;
    const userId = req.user.id;

    const space = await Space.findById(spaceId);

    if (!space) {
      return res.status(404).json({ message: "Space not found" });
    }

    // Only creator can delete
    if (space.creator.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Only the creator can delete the space" });
    }

    await Space.findByIdAndDelete(spaceId);

    res.status(200).json({ message: "Space deleted successfully" });
  } catch (error) {
    console.error("Error in deleteSpace controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
