import { closeSession } from "../lib/session.js";
import Room from "../models/Room.model.js";
import { deleteGroupChannel, roomChannelId } from "../lib/stream.js";
import { createNotification } from "./notification.controller.js";

export async function createRoom(req, res) {
  try {
    const { name, description, joinPolicy, team } = req.body;
    const creatorId = req.user.id;

    if (!name || !description) {
      return res
        .status(400)
        .json({ message: "A room needs a name and a description" });
    }

    // A room can only be attached to a team the creator can manage.
    let teamId = null;
    if (team) {
      const Team = (await import("../models/Team.model.js")).default;
      const parent = await Team.findById(team);
      if (!parent || !parent.canManage(creatorId)) {
        return res
          .status(403)
          .json({ message: "You can't create rooms for that team" });
      }
      teamId = parent._id;
    }

    const room = await Room.create({
      name,
      description,
      joinPolicy: joinPolicy === "approval" ? "approval" : "open",
      team: teamId,
      creator: creatorId,
      members: [creatorId],
    });

    const populatedRoom = await Room.findById(room._id).populate(
      "creator members",
      "fullName profilePic role"
    );

    res.status(201).json(populatedRoom);
  } catch (error) {
    console.error("Error in createRoom controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getAllRooms(req, res) {
  try {
    const Session = (await import("../models/Session.model.js")).default;
    
    // Team rooms are private to their team; public rooms are visible to all.
    const Team = (await import("../models/Team.model.js")).default;
    const myTeams = await Team.find({ "members.user": req.user.id }).select("_id");
    const myTeamIds = myTeams.map((t) => t._id);

    const rooms = await Room.find({
      isActive: true,
      $or: [{ team: null }, { team: { $in: myTeamIds } }],
    })
      .populate("creator members pendingRequests", "fullName profilePic role")
      .populate("team", "name kind")
      .sort({ createdAt: -1 });

    // One grouped aggregate instead of a Session.find per room (was N+1).
    const totals = await Session.aggregate([
      { $match: { isCompleted: true, abandoned: { $ne: true } } },
      { $group: { _id: "$room", totalMinutes: { $sum: "$actualDuration" } } },
    ]);
    const totalsByRoom = new Map(
      totals.map((t) => [String(t._id), t.totalMinutes])
    );

    const spacesWithStats = rooms.map((room) => ({
      ...room.toObject(),
      totalStreamedMinutes: totalsByRoom.get(String(room._id)) || 0,
    }));

    res.status(200).json(spacesWithStats);
  } catch (error) {
    console.error("Error in getAllRooms controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getMyRooms(req, res) {
  try {
    const userId = req.user.id;

    const rooms = await Room.find({
      $or: [{ creator: userId }, { members: userId }],
      isActive: true,
    })
      .populate("creator members pendingRequests", "fullName profilePic role")
      .populate("team", "name kind")
      .sort({ createdAt: -1 });

    res.status(200).json(rooms);
  } catch (error) {
    console.error("Error in getMyRooms controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getRoomById(req, res) {
  try {
    const { id } = req.params;

    const room = await Room.findById(id)
      .populate("creator members pendingRequests", "fullName profilePic role")
      .populate("sessions.host", "fullName profilePic")
      .populate("announcements.createdBy", "fullName profilePic")
      .populate("activeStreams.user", "fullName profilePic role");

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.status(200).json(room);
  } catch (error) {
    console.error("Error in getRoomById controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function requestToJoinRoom(req, res) {
  try {
    const { id: roomId } = req.params;
    const userId = req.user.id;

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (room.members.includes(userId)) {
      return res
        .status(400)
        .json({ message: "You are already a member of this room" });
    }

    // Team rooms are for that team only, whatever the join policy says.
    if (room.team) {
      const Team = (await import("../models/Team.model.js")).default;
      const parent = await Team.findById(room.team);
      if (!parent || !parent.roleOf(userId)) {
        return res
          .status(403)
          .json({ message: "This room belongs to a team you are not in" });
      }
    }

    if (room.pendingRequests.includes(userId)) {
      return res
        .status(400)
        .json({ message: "You have already requested to join" });
    }

    // Open rooms admit immediately — no request, no waiting, no approval.
    if (room.joinPolicy !== "approval") {
      room.members.push(userId);
      await room.save();

      await createNotification({
        recipient: room.creator,
        sender: userId,
        type: "room_join_approved",
        message: `${req.user.fullName} joined ${room.name}`,
        relatedRoom: roomId,
      });

      return res
        .status(200)
        .json({ joined: true, message: `Welcome to ${room.name}` });
    }

    room.pendingRequests.push(userId);
    await room.save();

    await createNotification({
      recipient: room.creator,
      sender: userId,
      type: "room_join_request",
      message: `${req.user.fullName} requested to join ${room.name}`,
      relatedRoom: roomId,
    });

    res.status(200).json({ joined: false, message: "Join request sent successfully" });
  } catch (error) {
    console.error("Error in requestToJoinRoom controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function approveJoinRequest(req, res) {
  try {
    const { id: roomId } = req.params;
    const { userId } = req.body;
    const requesterId = req.user.id;

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (room.creator.toString() !== requesterId) {
      return res
        .status(403)
        .json({ message: "Only the creator can approve requests" });
    }

    room.pendingRequests = room.pendingRequests.filter(
      (id) => id.toString() !== userId
    );
    room.members.push(userId);
    await room.save();

    await createNotification({
      recipient: userId,
      sender: requesterId,
      type: "room_join_approved",
      message: `Your request to join ${room.name} has been approved`,
      relatedRoom: roomId,
    });

    res.status(200).json({ message: "User added to room successfully" });
  } catch (error) {
    console.error("Error in approveJoinRequest controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function rejectJoinRequest(req, res) {
  try {
    const { id: roomId } = req.params;
    const { userId } = req.body;
    const requesterId = req.user.id;

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (room.creator.toString() !== requesterId) {
      return res
        .status(403)
        .json({ message: "Only the creator can reject requests" });
    }

    room.pendingRequests = room.pendingRequests.filter(
      (id) => id.toString() !== userId
    );
    await room.save();

    await createNotification({
      recipient: userId,
      sender: requesterId,
      type: "room_join_rejected",
      message: `Your request to join ${room.name} was declined`,
      relatedRoom: roomId,
    });

    res.status(200).json({ message: "Request rejected" });
  } catch (error) {
    console.error("Error in rejectJoinRequest controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function leaveRoom(req, res) {
  try {
    const { id: roomId } = req.params;
    const userId = req.user.id;

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (room.creator.toString() === userId) {
      return res
        .status(400)
        .json({
          message: "Creator cannot leave. Delete the room instead.",
        });
    }

    room.members = room.members.filter((id) => id.toString() !== userId);
    await room.save();

    res.status(200).json({ message: "Left room successfully" });
  } catch (error) {
    console.error("Error in leaveRoom controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function deleteRoom(req, res) {
  try {
    const { id: roomId } = req.params;
    const userId = req.user.id;

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (room.creator.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Only the creator can delete the room" });
    }

    await Room.findByIdAndDelete(roomId);
    // Per-member pruning would leave the conversation itself behind, so the
    // channel goes with the room.
    await deleteGroupChannel(roomChannelId(roomId));

    res.status(200).json({ message: "Room deleted successfully" });
  } catch (error) {
    console.error("Error in deleteRoom controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function createAnnouncement(req, res) {
  try {
    const { id: roomId } = req.params;
    const userId = req.user.id;
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required" });
    }

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (room.creator.toString() !== userId) {
      return res.status(403).json({ message: "Only the creator can create announcements" });
    }

    const newAnnouncement = {
      title,
      content,
      createdBy: userId,
    };

    room.announcements.unshift(newAnnouncement);
    await room.save();

    const populatedRoom = await Room.findById(roomId)
      .populate("creator members pendingRequests", "fullName profilePic role")
      .populate("sessions.host", "fullName profilePic")
      .populate("announcements.createdBy", "fullName profilePic");

    const membersToNotify = room.members.filter(
      (memberId) => memberId.toString() !== userId
    );

    await Promise.all(
      membersToNotify.map((memberId) =>
        createNotification({
          recipient: memberId,
          sender: userId,
          type: "announcement",
          message: `New announcement in ${room.name}: ${title}`,
          relatedRoom: roomId,
          metadata: {
            announcementTitle: title,
            announcementContent: content,
          },
        })
      )
    );

    res.status(201).json(populatedRoom);
  } catch (error) {
    console.error("Error in createAnnouncement controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function deleteAnnouncement(req, res) {
  try {
    const { id: roomId, announcementId } = req.params;
    const userId = req.user.id;

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (room.creator.toString() !== userId) {
      return res.status(403).json({ message: "Only the creator can delete announcements" });
    }

    room.announcements = room.announcements.filter(
      (announcement) => announcement._id.toString() !== announcementId
    );

    await room.save();

    const populatedRoom = await Room.findById(roomId)
      .populate("creator members pendingRequests", "fullName profilePic role")
      .populate("sessions.host", "fullName profilePic")
      .populate("announcements.createdBy", "fullName profilePic");

    res.status(200).json(populatedRoom);
  } catch (error) {
    console.error("Error in deleteAnnouncement controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function joinStream(req, res) {
  try {
    const { id: roomId } = req.params;
    const { workTopic, targetDuration, tasks, isVideoEnabled, isAudioEnabled } = req.body;
    const userId = req.user.id;

    if (!workTopic || workTopic.trim() === "") {
      return res.status(400).json({ message: "Tell us what you are working on" });
    }

    if (!targetDuration || targetDuration < 5) {
      return res.status(400).json({ message: "Target duration must be at least 5 minutes" });
    }

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (!room.members.includes(userId)) {
      return res.status(403).json({ message: "Only members can join the stream" });
    }

    // Any member can open the room. It used to wait for the creator to enter
    // first, which meant a team in three timezones could not start without the
    // one person who made the room. Membership is the only gate that matters.
    if (!room.streamInitialized) {
      room.streamInitialized = true;
    }

    const isAlreadyStreaming = room.activeStreams.some(
      (stream) => stream.user.toString() === userId
    );

    if (isAlreadyStreaming) {
      return res.status(400).json({ message: "You are already in the stream" });
    }

    const Session = (await import("../models/Session.model.js")).default;

    const newSession = new Session({
      user: userId,
      room: roomId,
      workTopic: workTopic.trim(),
      targetDuration: targetDuration,
      tasks: tasks || [],
      mediaUsage: {
        videoEnabled: isVideoEnabled || false,
        audioEnabled: isAudioEnabled || false,
      },
    });

    await newSession.save();

    const activeSession = room.activeSessionId ? room.sessions.id(room.activeSessionId) : null;

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

    room.activeStreams.push({
      user: userId,
      workTopic: workTopic.trim(),
      sessionId: newSession._id,
      isVideoEnabled: isVideoEnabled || false,
      isAudioEnabled: isAudioEnabled || false,
    });

    await room.save();

    const populatedRoom = await Room.findById(roomId)
      .populate("creator members pendingRequests", "fullName profilePic role")
      .populate("sessions.host", "fullName profilePic")
      .populate("sessions.participants.user", "fullName profilePic")
      .populate("announcements.createdBy", "fullName profilePic")
      .populate("activeStreams.user", "fullName profilePic role");

    res.status(200).json(populatedRoom);
  } catch (error) {
    console.error("Error in joinStream controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function leaveStream(req, res) {
  try {
    const { id: roomId } = req.params;
    const userId = req.user.id;

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const streamEntry = room.activeStreams.find(
      (stream) => stream.user.toString() === userId
    );

    const Session = (await import("../models/Session.model.js")).default;

    if (streamEntry && streamEntry.sessionId) {
      const userSession = await Session.findById(streamEntry.sessionId);
      
      await closeSession(userSession);
    }

    if (streamEntry && streamEntry.sessionId) {
      const session = room.sessions.id(streamEntry.sessionId);
      
      if (session) {
        const participant = session.participants.find(
          p => p.user.toString() === userId
        );

        if (participant && !participant.leftAt) {
          participant.leftAt = new Date();
          const minutesWorked = Math.round(
            (participant.leftAt - participant.joinedAt) / (1000 * 60)
          );
          participant.totalMinutes = minutesWorked;
          
          session.stats.totalHoursWorked += minutesWorked / 60;
        }
      }
    }

    room.activeStreams = room.activeStreams.filter(
      (stream) => stream.user.toString() !== userId
    );

    await room.save();

    const populatedRoom = await Room.findById(roomId)
      .populate("creator members pendingRequests", "fullName profilePic role")
      .populate("sessions.host", "fullName profilePic")
      .populate("sessions.participants.user", "fullName profilePic")
      .populate("announcements.createdBy", "fullName profilePic")
      .populate("activeStreams.user", "fullName profilePic role");

    res.status(200).json(populatedRoom);
  } catch (error) {
    console.error("Error in leaveStream controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function removeFromStream(req, res) {
  try {
    const { id: roomId, userId: targetUserId } = req.params;
    const requesterId = req.user.id;
    const { reason } = req.body;

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (room.creator.toString() !== requesterId) {
      return res.status(403).json({ message: "Only the creator can remove users from stream" });
    }

    const streamEntry = room.activeStreams.find(
      (stream) => stream.user.toString() === targetUserId
    );

    const Session = (await import("../models/Session.model.js")).default;

    if (streamEntry && streamEntry.sessionId) {
      const userSession = await Session.findById(streamEntry.sessionId);
      
      await closeSession(userSession);
    }

    if (streamEntry && streamEntry.sessionId) {
      const session = room.sessions.id(streamEntry.sessionId);
      
      if (session) {
        const participant = session.participants.find(
          p => p.user.toString() === targetUserId
        );

        if (participant && !participant.leftAt) {
          participant.leftAt = new Date();
          const minutesWorked = Math.round(
            (participant.leftAt - participant.joinedAt) / (1000 * 60)
          );
          participant.totalMinutes = minutesWorked;
          
          session.stats.totalHoursWorked += minutesWorked / 60;
        }
      }
    }

    room.activeStreams = room.activeStreams.filter(
      (stream) => stream.user.toString() !== targetUserId
    );

    await room.save();

    const notificationMessage = reason 
      ? `You were removed from the stream in ${room.name}. Reason: ${reason}`
      : `You were removed from the stream in ${room.name}`;
    
    await createNotification({
      recipient: targetUserId,
      sender: requesterId,
      type: "removed_from_stream",
      message: notificationMessage,
      relatedRoom: roomId,
    });

    const populatedRoom = await Room.findById(roomId)
      .populate("creator members pendingRequests", "fullName profilePic role")
      .populate("sessions.host", "fullName profilePic")
      .populate("sessions.participants.user", "fullName profilePic")
      .populate("announcements.createdBy", "fullName profilePic")
      .populate("activeStreams.user", "fullName profilePic role");

    res.status(200).json(populatedRoom);
  } catch (error) {
    console.error("Error in removeFromStream controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
