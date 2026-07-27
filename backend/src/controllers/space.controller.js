import Space from "../models/Space.model.js";
import { createNotification } from "./notification.controller.js";

export async function createSpace(req, res) {
  try {
    const { name, description, skill } = req.body;
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
    const Session = (await import("../models/Session.model.js")).default;
    
    const spaces = await Space.find({ isActive: true })
      .populate("creator members", "fullName profilePic learningSkill")
      .sort({ createdAt: -1 });

    const spacesWithStats = await Promise.all(
      spaces.map(async (space) => {
        const sessions = await Session.find({ 
          space: space._id, 
          isCompleted: true 
        }).select("actualDuration");
        
        const totalMinutes = sessions.reduce((sum, s) => sum + (s.actualDuration || 0), 0);
        
        return {
          ...space.toObject(),
          totalStreamedMinutes: totalMinutes,
        };
      })
    );

    res.status(200).json(spacesWithStats);
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

    const space = await Space.findById(id)
      .populate("creator members pendingRequests", "fullName profilePic learningSkill nativeLanguage")
      .populate("sessions.host", "fullName profilePic")
      .populate("announcements.createdBy", "fullName profilePic")
      .populate("activeStreams.user", "fullName profilePic learningSkill");

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

    if (space.members.includes(userId)) {
      return res
        .status(400)
        .json({ message: "You are already a member of this space" });
    }

    if (space.pendingRequests.includes(userId)) {
      return res
        .status(400)
        .json({ message: "You have already requested to join" });
    }

    space.pendingRequests.push(userId);
    await space.save();

    await createNotification({
      recipient: space.creator,
      sender: userId,
      type: "space_join_request",
      message: `${req.user.fullName} requested to join ${space.name}`,
      relatedSpace: spaceId,
    });

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

    if (space.creator.toString() !== requesterId) {
      return res
        .status(403)
        .json({ message: "Only the creator can approve requests" });
    }

    space.pendingRequests = space.pendingRequests.filter(
      (id) => id.toString() !== userId
    );
    space.members.push(userId);
    await space.save();

    await createNotification({
      recipient: userId,
      sender: requesterId,
      type: "space_join_approved",
      message: `Your request to join ${space.name} has been approved`,
      relatedSpace: spaceId,
    });

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

    if (space.creator.toString() !== requesterId) {
      return res
        .status(403)
        .json({ message: "Only the creator can reject requests" });
    }

    space.pendingRequests = space.pendingRequests.filter(
      (id) => id.toString() !== userId
    );
    await space.save();

    await createNotification({
      recipient: userId,
      sender: requesterId,
      type: "space_join_rejected",
      message: `Your request to join ${space.name} was declined`,
      relatedSpace: spaceId,
    });

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

    if (space.creator.toString() === userId) {
      return res
        .status(400)
        .json({
          message: "Creator cannot leave. Delete the space instead.",
        });
    }

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

export async function createAnnouncement(req, res) {
  try {
    const { id: spaceId } = req.params;
    const userId = req.user.id;
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required" });
    }

    const space = await Space.findById(spaceId);

    if (!space) {
      return res.status(404).json({ message: "Space not found" });
    }

    if (space.creator.toString() !== userId) {
      return res.status(403).json({ message: "Only the creator can create announcements" });
    }

    const newAnnouncement = {
      title,
      content,
      createdBy: userId,
    };

    space.announcements.unshift(newAnnouncement);
    await space.save();

    const populatedSpace = await Space.findById(spaceId)
      .populate("creator members pendingRequests", "fullName profilePic learningSkill")
      .populate("sessions.host", "fullName profilePic")
      .populate("announcements.createdBy", "fullName profilePic");

    const membersToNotify = space.members.filter(
      (memberId) => memberId.toString() !== userId
    );

    await Promise.all(
      membersToNotify.map((memberId) =>
        createNotification({
          recipient: memberId,
          sender: userId,
          type: "announcement",
          message: `New announcement in ${space.name}: ${title}`,
          relatedSpace: spaceId,
          metadata: {
            announcementTitle: title,
            announcementContent: content,
          },
        })
      )
    );

    res.status(201).json(populatedSpace);
  } catch (error) {
    console.error("Error in createAnnouncement controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function deleteAnnouncement(req, res) {
  try {
    const { id: spaceId, announcementId } = req.params;
    const userId = req.user.id;

    const space = await Space.findById(spaceId);

    if (!space) {
      return res.status(404).json({ message: "Space not found" });
    }

    if (space.creator.toString() !== userId) {
      return res.status(403).json({ message: "Only the creator can delete announcements" });
    }

    space.announcements = space.announcements.filter(
      (announcement) => announcement._id.toString() !== announcementId
    );

    await space.save();

    const populatedSpace = await Space.findById(spaceId)
      .populate("creator members pendingRequests", "fullName profilePic learningSkill")
      .populate("sessions.host", "fullName profilePic")
      .populate("announcements.createdBy", "fullName profilePic");

    res.status(200).json(populatedSpace);
  } catch (error) {
    console.error("Error in deleteAnnouncement controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function joinStream(req, res) {
  try {
    const { id: spaceId } = req.params;
    const { grindingTopic, targetDuration, tasks, isVideoEnabled, isAudioEnabled } = req.body;
    const userId = req.user.id;

    if (!grindingTopic || grindingTopic.trim() === "") {
      return res.status(400).json({ message: "Grinding topic is required" });
    }

    if (!targetDuration || targetDuration < 5) {
      return res.status(400).json({ message: "Target duration must be at least 5 minutes" });
    }

    const space = await Space.findById(spaceId);

    if (!space) {
      return res.status(404).json({ message: "Space not found" });
    }

    if (!space.members.includes(userId)) {
      return res.status(403).json({ message: "Only members can join the stream" });
    }

    const isCreator = space.creator.toString() === userId;

    if (!space.streamInitialized && !isCreator) {
      return res.status(403).json({ 
        message: "The stream room hasn't been initialized yet. The creator must enter first." 
      });
    }

    if (isCreator && !space.streamInitialized) {
      space.streamInitialized = true;
    }

    const isAlreadyStreaming = space.activeStreams.some(
      (stream) => stream.user.toString() === userId
    );

    if (isAlreadyStreaming) {
      return res.status(400).json({ message: "You are already in the stream" });
    }

    const Session = (await import("../models/Session.model.js")).default;

    const newSession = new Session({
      user: userId,
      space: spaceId,
      grindingTopic: grindingTopic.trim(),
      targetDuration: targetDuration,
      tasks: tasks || [],
      mediaUsage: {
        videoEnabled: isVideoEnabled || false,
        audioEnabled: isAudioEnabled || false,
      },
    });

    await newSession.save();

    const activeSession = space.activeSessionId ? space.sessions.id(space.activeSessionId) : null;

    if (activeSession && activeSession.status === "live") {
      const isParticipant = activeSession.participants.some(
        p => p.user.toString() === userId
      );

      if (!isParticipant) {
        activeSession.participants.push({
          user: userId,
          joinedAt: new Date(),
        });
        
        const uniqueParticipants = new Set(
          activeSession.participants.map(p => p.user.toString())
        );
        activeSession.stats.totalParticipants = uniqueParticipants.size;
      }
    }

    space.activeStreams.push({
      user: userId,
      grindingTopic: grindingTopic.trim(),
      sessionId: newSession._id,
      isVideoEnabled: isVideoEnabled || false,
      isAudioEnabled: isAudioEnabled || false,
    });

    await space.save();

    const populatedSpace = await Space.findById(spaceId)
      .populate("creator members pendingRequests", "fullName profilePic learningSkill")
      .populate("sessions.host", "fullName profilePic")
      .populate("sessions.participants.user", "fullName profilePic")
      .populate("announcements.createdBy", "fullName profilePic")
      .populate("activeStreams.user", "fullName profilePic learningSkill");

    res.status(200).json(populatedSpace);
  } catch (error) {
    console.error("Error in joinStream controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function leaveStream(req, res) {
  try {
    const { id: spaceId } = req.params;
    const userId = req.user.id;

    const space = await Space.findById(spaceId);

    if (!space) {
      return res.status(404).json({ message: "Space not found" });
    }

    const streamEntry = space.activeStreams.find(
      (stream) => stream.user.toString() === userId
    );

    const Session = (await import("../models/Session.model.js")).default;

    if (streamEntry && streamEntry.sessionId) {
      const userSession = await Session.findById(streamEntry.sessionId);
      
      if (userSession && !userSession.isCompleted) {
        userSession.endTime = new Date();
        userSession.isCompleted = true;
        
        const durationMs = userSession.endTime - userSession.startTime;
        userSession.actualDuration = Math.round(durationMs / (1000 * 60));
        
        await userSession.save();
      }
    }

    if (streamEntry && streamEntry.sessionId) {
      const session = space.sessions.id(streamEntry.sessionId);
      
      if (session) {
        const participant = session.participants.find(
          p => p.user.toString() === userId
        );

        if (participant && !participant.leftAt) {
          participant.leftAt = new Date();
          const minutesGrinded = Math.round(
            (participant.leftAt - participant.joinedAt) / (1000 * 60)
          );
          participant.totalMinutes = minutesGrinded;
          
          session.stats.totalHoursGrinded += minutesGrinded / 60;
        }
      }
    }

    space.activeStreams = space.activeStreams.filter(
      (stream) => stream.user.toString() !== userId
    );

    await space.save();

    const populatedSpace = await Space.findById(spaceId)
      .populate("creator members pendingRequests", "fullName profilePic learningSkill")
      .populate("sessions.host", "fullName profilePic")
      .populate("sessions.participants.user", "fullName profilePic")
      .populate("announcements.createdBy", "fullName profilePic")
      .populate("activeStreams.user", "fullName profilePic learningSkill");

    res.status(200).json(populatedSpace);
  } catch (error) {
    console.error("Error in leaveStream controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function removeFromStream(req, res) {
  try {
    const { id: spaceId, userId: targetUserId } = req.params;
    const requesterId = req.user.id;
    const { reason } = req.body;

    const space = await Space.findById(spaceId);

    if (!space) {
      return res.status(404).json({ message: "Space not found" });
    }

    if (space.creator.toString() !== requesterId) {
      return res.status(403).json({ message: "Only the creator can remove users from stream" });
    }

    const streamEntry = space.activeStreams.find(
      (stream) => stream.user.toString() === targetUserId
    );

    const Session = (await import("../models/Session.model.js")).default;

    if (streamEntry && streamEntry.sessionId) {
      const userSession = await Session.findById(streamEntry.sessionId);
      
      if (userSession && !userSession.isCompleted) {
        userSession.endTime = new Date();
        userSession.isCompleted = true;
        
        const durationMs = userSession.endTime - userSession.startTime;
        userSession.actualDuration = Math.round(durationMs / (1000 * 60));
        
        await userSession.save();
      }
    }

    if (streamEntry && streamEntry.sessionId) {
      const session = space.sessions.id(streamEntry.sessionId);
      
      if (session) {
        const participant = session.participants.find(
          p => p.user.toString() === targetUserId
        );

        if (participant && !participant.leftAt) {
          participant.leftAt = new Date();
          const minutesGrinded = Math.round(
            (participant.leftAt - participant.joinedAt) / (1000 * 60)
          );
          participant.totalMinutes = minutesGrinded;
          
          session.stats.totalHoursGrinded += minutesGrinded / 60;
        }
      }
    }

    space.activeStreams = space.activeStreams.filter(
      (stream) => stream.user.toString() !== targetUserId
    );

    await space.save();

    const notificationMessage = reason 
      ? `You were removed from the stream in ${space.name}. Reason: ${reason}`
      : `You were removed from the stream in ${space.name}`;
    
    await createNotification({
      recipient: targetUserId,
      sender: requesterId,
      type: "removed_from_stream",
      message: notificationMessage,
      relatedSpace: spaceId,
    });

    const populatedSpace = await Space.findById(spaceId)
      .populate("creator members pendingRequests", "fullName profilePic learningSkill")
      .populate("sessions.host", "fullName profilePic")
      .populate("sessions.participants.user", "fullName profilePic")
      .populate("announcements.createdBy", "fullName profilePic")
      .populate("activeStreams.user", "fullName profilePic learningSkill");

    res.status(200).json(populatedSpace);
  } catch (error) {
    console.error("Error in removeFromStream controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
