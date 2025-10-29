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

    space.pendingRequests.push(userId);
    await space.save();

    // Create notification for space creator
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

    // Only creator can approve
    if (space.creator.toString() !== requesterId) {
      return res
        .status(403)
        .json({ message: "Only the creator can approve requests" });
    }

    // Remove from pending and add to members
    space.pendingRequests = space.pendingRequests.filter(
      (id) => id.toString() !== userId
    );
    space.members.push(userId);
    await space.save();

    // Create notification for the user
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

    // Create notification for the user
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

// Sessions Management
export async function createSession(req, res) {
  try {
    const { id: spaceId } = req.params;
    const userId = req.user.id;
    const { title, description, scheduledAt, duration } = req.body;

    if (!title || !scheduledAt) {
      return res.status(400).json({ message: "Title and scheduled time are required" });
    }

    const space = await Space.findById(spaceId);

    if (!space) {
      return res.status(404).json({ message: "Space not found" });
    }

    // Only creator can create sessions
    if (space.creator.toString() !== userId) {
      return res.status(403).json({ message: "Only the creator can create sessions" });
    }

    const newSession = {
      title,
      description,
      scheduledAt: new Date(scheduledAt),
      duration: duration || 60,
      host: userId,
      status: "scheduled",
    };

    space.sessions.push(newSession);
    await space.save();

    const populatedSpace = await Space.findById(spaceId)
      .populate("creator members pendingRequests", "fullName profilePic learningSkill")
      .populate("sessions.host", "fullName profilePic")
      .populate("announcements.createdBy", "fullName profilePic");

    res.status(201).json(populatedSpace);
  } catch (error) {
    console.error("Error in createSession controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function updateSessionStatus(req, res) {
  try {
    const { id: spaceId, sessionId } = req.params;
    const userId = req.user.id;
    const { status, streamUrl } = req.body;

    const space = await Space.findById(spaceId);

    if (!space) {
      return res.status(404).json({ message: "Space not found" });
    }

    // Only creator can update session status
    if (space.creator.toString() !== userId) {
      return res.status(403).json({ message: "Only the creator can update sessions" });
    }

    const session = space.sessions.id(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Handle status transitions
    if (status) {
      const oldStatus = session.status;
      session.status = status;

      // Starting session
      if (status === "live" && oldStatus === "scheduled") {
        session.startedAt = new Date();
        space.activeSessionId = sessionId;
        
        // Notify all space members about the session starting
        const memberIds = space.members.filter(
          (memberId) => memberId.toString() !== userId
        );
        
        for (const memberId of memberIds) {
          await createNotification({
            recipient: memberId,
            sender: userId,
            type: "session_started",
            message: `Session "${session.title}" has started in ${space.name}`,
            relatedSpace: spaceId,
            relatedSession: sessionId,
          });
        }
      }

      // Ending session
      if ((status === "completed" || status === "cancelled") && oldStatus === "live") {
        session.endedAt = new Date();
        
        // Calculate actual duration
        if (session.startedAt) {
          session.stats.actualDuration = Math.round(
            (session.endedAt - session.startedAt) / (1000 * 60)
          );
        }

        // Update any remaining active participants
        session.participants.forEach(participant => {
          if (!participant.leftAt) {
            participant.leftAt = session.endedAt;
            const minutesGrinded = Math.round(
              (participant.leftAt - participant.joinedAt) / (1000 * 60)
            );
            participant.totalMinutes = minutesGrinded;
            session.stats.totalHoursGrinded += minutesGrinded / 60;
          }
        });

        // Clear active streams for this session
        space.activeStreams = space.activeStreams.filter(
          stream => stream.sessionId?.toString() !== sessionId
        );

        // Clear active session
        if (space.activeSessionId?.toString() === sessionId) {
          space.activeSessionId = null;
        }
      }
    }

    if (streamUrl) session.streamUrl = streamUrl;

    await space.save();

    const populatedSpace = await Space.findById(spaceId)
      .populate("creator members pendingRequests", "fullName profilePic learningSkill")
      .populate("sessions.host", "fullName profilePic")
      .populate("sessions.participants.user", "fullName profilePic")
      .populate("announcements.createdBy", "fullName profilePic");

    res.status(200).json(populatedSpace);
  } catch (error) {
    console.error("Error in updateSessionStatus controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// Announcements Management
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

    // Only creator can create announcements
    if (space.creator.toString() !== userId) {
      return res.status(403).json({ message: "Only the creator can create announcements" });
    }

    const newAnnouncement = {
      title,
      content,
      createdBy: userId,
    };

    space.announcements.unshift(newAnnouncement); // Add to beginning
    await space.save();

    const populatedSpace = await Space.findById(spaceId)
      .populate("creator members pendingRequests", "fullName profilePic learningSkill")
      .populate("sessions.host", "fullName profilePic")
      .populate("announcements.createdBy", "fullName profilePic");

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

    // Only creator can delete announcements
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

    // Check if user is a member
    if (!space.members.includes(userId)) {
      return res.status(403).json({ message: "Only members can join the stream" });
    }

    const isCreator = space.creator.toString() === userId;

    // If stream hasn't been initialized and user is not creator, prevent joining
    if (!space.streamInitialized && !isCreator) {
      return res.status(403).json({ 
        message: "The stream room hasn't been initialized yet. The creator must enter first." 
      });
    }

    // If creator is joining for the first time, initialize the stream
    if (isCreator && !space.streamInitialized) {
      space.streamInitialized = true;
    }

    // Check if user is already streaming
    const isAlreadyStreaming = space.activeStreams.some(
      (stream) => stream.user.toString() === userId
    );

    if (isAlreadyStreaming) {
      return res.status(400).json({ message: "You are already in the stream" });
    }

    // Import Session model
    const Session = (await import("../models/Session.model.js")).default;

    // Create a new session for this user
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

    // Find active session if any
    const activeSession = space.activeSessionId ? space.sessions.id(space.activeSessionId) : null;

    // If there's an active session, add user to participants
    if (activeSession && activeSession.status === "live") {
      const isParticipant = activeSession.participants.some(
        p => p.user.toString() === userId
      );

      if (!isParticipant) {
        activeSession.participants.push({
          user: userId,
          joinedAt: new Date(),
        });
        
        // Update unique participant count
        const uniqueParticipants = new Set(
          activeSession.participants.map(p => p.user.toString())
        );
        activeSession.stats.totalParticipants = uniqueParticipants.size;
      }
    }

    // Add user to active streams with session reference
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

    // Find the stream entry to get sessionId
    const streamEntry = space.activeStreams.find(
      (stream) => stream.user.toString() === userId
    );

    // Import Session model
    const Session = (await import("../models/Session.model.js")).default;

    // If user has a personal session, complete it
    if (streamEntry && streamEntry.sessionId) {
      const userSession = await Session.findById(streamEntry.sessionId);
      
      if (userSession && !userSession.isCompleted) {
        userSession.endTime = new Date();
        userSession.isCompleted = true;
        
        // Calculate actual duration in minutes
        const durationMs = userSession.endTime - userSession.startTime;
        userSession.actualDuration = Math.round(durationMs / (1000 * 60));
        
        await userSession.save();
      }
    }

    // If user was in a space session, update their participation stats
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
          
          // Update session stats
          session.stats.totalHoursGrinded += minutesGrinded / 60;
        }
      }
    }

    // Remove user from active streams
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

export async function updateGrindingTopic(req, res) {
  try {
    const { id: spaceId } = req.params;
    const { grindingTopic } = req.body;
    const userId = req.user.id;

    if (!grindingTopic || grindingTopic.trim() === "") {
      return res.status(400).json({ message: "Grinding topic is required" });
    }

    const space = await Space.findById(spaceId);

    if (!space) {
      return res.status(404).json({ message: "Space not found" });
    }

    // Find user's stream entry
    const streamEntry = space.activeStreams.find(
      (stream) => stream.user.toString() === userId
    );

    if (!streamEntry) {
      return res.status(404).json({ message: "You are not currently streaming" });
    }

    // Update grinding topic
    streamEntry.grindingTopic = grindingTopic.trim();
    await space.save();

    const populatedSpace = await Space.findById(spaceId)
      .populate("creator members pendingRequests", "fullName profilePic learningSkill")
      .populate("sessions.host", "fullName profilePic")
      .populate("sessions.participants.user", "fullName profilePic")
      .populate("announcements.createdBy", "fullName profilePic")
      .populate("activeStreams.user", "fullName profilePic learningSkill");

    res.status(200).json(populatedSpace);
  } catch (error) {
    console.error("Error in updateGrindingTopic controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function removeFromStream(req, res) {
  try {
    const { id: spaceId, userId: targetUserId } = req.params;
    const requesterId = req.user.id;
    const { reason } = req.body; // Get reason from request body

    const space = await Space.findById(spaceId);

    if (!space) {
      return res.status(404).json({ message: "Space not found" });
    }

    // Only creator can remove users
    if (space.creator.toString() !== requesterId) {
      return res.status(403).json({ message: "Only the creator can remove users from stream" });
    }

    // Find the stream entry to get sessionId
    const streamEntry = space.activeStreams.find(
      (stream) => stream.user.toString() === targetUserId
    );

    // Import Session model
    const Session = (await import("../models/Session.model.js")).default;

    // If user has a personal session, complete it
    if (streamEntry && streamEntry.sessionId) {
      const userSession = await Session.findById(streamEntry.sessionId);
      
      if (userSession && !userSession.isCompleted) {
        userSession.endTime = new Date();
        userSession.isCompleted = true;
        
        // Calculate actual duration in minutes
        const durationMs = userSession.endTime - userSession.startTime;
        userSession.actualDuration = Math.round(durationMs / (1000 * 60));
        
        await userSession.save();
      }
    }

    // If user was in a session, update their participation stats
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
          
          // Update session stats
          session.stats.totalHoursGrinded += minutesGrinded / 60;
        }
      }
    }

    // Remove user from active streams
    space.activeStreams = space.activeStreams.filter(
      (stream) => stream.user.toString() !== targetUserId
    );


    await space.save();

    // Notify the removed user with reason
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

export async function toggleStreamMedia(req, res) {
  try {
    const { id: spaceId } = req.params;
    const { isVideoEnabled, isAudioEnabled } = req.body;
    const userId = req.user.id;

    const space = await Space.findById(spaceId);

    if (!space) {
      return res.status(404).json({ message: "Space not found" });
    }

    // Find user's stream entry
    const streamEntry = space.activeStreams.find(
      (stream) => stream.user.toString() === userId
    );

    if (!streamEntry) {
      return res.status(404).json({ message: "You are not currently streaming" });
    }

    // Update media settings
    if (typeof isVideoEnabled === 'boolean') {
      streamEntry.isVideoEnabled = isVideoEnabled;
    }
    if (typeof isAudioEnabled === 'boolean') {
      streamEntry.isAudioEnabled = isAudioEnabled;
    }

    await space.save();

    const populatedSpace = await Space.findById(spaceId)
      .populate("creator members pendingRequests", "fullName profilePic learningSkill")
      .populate("sessions.host", "fullName profilePic")
      .populate("sessions.participants.user", "fullName profilePic")
      .populate("announcements.createdBy", "fullName profilePic")
      .populate("activeStreams.user", "fullName profilePic learningSkill");

    res.status(200).json(populatedSpace);
  } catch (error) {
    console.error("Error in toggleStreamMedia controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
