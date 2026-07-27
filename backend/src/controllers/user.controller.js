import FriendRequest from "../models/FriendRequest.model.js";
import User from "../models/User.model.js";
import Notification from "../models/Notification.model.js";
import { createNotification } from "./notification.controller.js";

export async function getRecommendedUsers(req, res) {
  try {
    const currentUserId = req.user.id;
    const currentUser = req.user;

    const friendRequests = await FriendRequest.find({
      recipient: currentUserId,
    });
    const senders = friendRequests.map((req) => req.sender);

    const recommendedUsers = await User.find({
      $and: [
        { _id: { $ne: currentUserId } },
        { _id: { $nin: currentUser.friends } },
        { _id: { $nin: senders } },
        { isOnboarded: true },
      ],
    });

    res.status(200).json(recommendedUsers);
  } catch (error) {
    console.error("Error in gerRecommendedUsers controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getMyFriends(req, res) {
  try {
    const user = await User.findById(req.user.id)
      .select("friends")
      .populate(
        "friends",
        "fullName bio location profilePic nativeLanguage learningSkill"
      );

    res.status(200).json(user.friends);
  } catch (error) {
    console.error("Error in getMyFriends controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function sendFriendRequest(req, res) {
  try {
    const myId = req.user.id;
    const { id: recipientId } = req.params;

    if (myId === recipientId) {
      return res
        .status(400)
        .json({ message: "You can't send friend request to yourself" });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    if (recipient.friends.includes(myId)) {
      return res
        .status(400)
        .json({ message: "You are already friends with this user" });
    }

    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: myId, recipient: recipientId },
        { sender: recipientId, recipient: myId },
      ],
    });

    if (existingRequest) {
      return res.status(400).json({
        message: "A friend request already exists between you and this user",
      });
    }

    const friendRequest = await FriendRequest.create({
      sender: myId,
      recipient: recipientId,
    });

    await createNotification({
      recipient: recipientId,
      sender: myId,
      type: "friend_request",
      message: `${req.user.fullName} sent you a friend request`,
      metadata: {
        friendRequestId: friendRequest._id.toString(),
      },
    });

    res.status(201).json(friendRequest);
  } catch (error) {
    console.error("Error in sendFriendRequest controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function acceptFriendRequest(req, res) {
  try {
    const { id: requestId } = req.params;

    const friendRequest = await FriendRequest.findById(requestId);

    if (!friendRequest) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    if (friendRequest.recipient.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You are not authorized to accept this request" });
    }

    friendRequest.status = "accepted";
    await friendRequest.save();

    // $addToSet: adds elements to an array only if they do not already exist.
    await User.findByIdAndUpdate(friendRequest.sender, {
      $addToSet: { friends: friendRequest.recipient },
    });

    await User.findByIdAndUpdate(friendRequest.recipient, {
      $addToSet: { friends: friendRequest.sender },
    });

    await createNotification({
      recipient: friendRequest.sender,
      sender: friendRequest.recipient,
      type: "friend_request_accepted",
      message: `${req.user.fullName} accepted your friend request`,
    });

    await Notification.deleteOne({
      recipient: friendRequest.recipient,
      sender: friendRequest.sender,
      type: "friend_request",
      "metadata.friendRequestId": requestId,
    });

    res.status(200).json({ message: "Friend request accepted" });
  } catch (error) {
    console.log("Error in acceptFriendRequest controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getFriendRequests(req, res) {
  try {
    const incomingRequests = await FriendRequest.find({
      recipient: req.user.id,
      status: "pending",
    }).populate(
      "sender",
      "fullName profilePic nativeLanguage learningSkill"
    );

    const acceptedRequests = await FriendRequest.find({
      sender: req.user.id,
      status: "accepted",
      isNotificationSeen: { $ne: true },
    }).populate("recipient", "fullName profilePic");

    res.status(200).json({ incomingRequests, acceptedRequests });
  } catch (error) {
    console.log("Error in getPendingFriendRequests controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getOutgoingFriendRequests(req, res) {
  try {
    const outgoingRequests = await FriendRequest.find({
      sender: req.user.id,
      status: "pending",
    }).populate(
      "recipient",
      "fullName profilePic nativeLanguage learningSkill"
    );

    res.status(200).json(outgoingRequests);
  } catch (error) {
    console.log("Error in getOutgoingFriendReqs controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function declineFriendRequest(req, res) {
  try {
    const { id: requestId } = req.params;

    const friendRequest = await FriendRequest.findById(requestId);

    if (!friendRequest) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    if (friendRequest.recipient.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You are not authorized to decline this request" });
    }

    await FriendRequest.findByIdAndDelete(requestId);

    await Notification.deleteOne({
      recipient: friendRequest.recipient,
      sender: friendRequest.sender,
      type: "friend_request",
      "metadata.friendRequestId": requestId,
    });

    res.status(200).json({ message: "Friend request declined" });
  } catch (error) {
    console.log("Error in declineFriendRequest controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function cancelFriendRequest(req, res) {
  try {
    const { id: requestId } = req.params;

    const friendRequest = await FriendRequest.findById(requestId);

    if (!friendRequest) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    if (friendRequest.sender.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You are not authorized to cancel this request" });
    }

    await FriendRequest.findByIdAndDelete(requestId);

    res.status(200).json({ message: "Friend request cancelled" });
  } catch (error) {
    console.log("Error in cancelFriendRequest controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function unfriend(req, res) {
  try {
    const myId = req.user.id;
    const { id: friendId } = req.params;

    if (myId === friendId) {
      return res.status(400).json({ message: "You cannot unfriend yourself" });
    }

    const myUser = await User.findById(myId);
    const friendUser = await User.findById(friendId);

    if (!friendUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!myUser.friends.includes(friendId)) {
      return res.status(400).json({ message: "You are not friends with this user" });
    }

    await User.findByIdAndUpdate(myId, {
      $pull: { friends: friendId },
    });

    await User.findByIdAndUpdate(friendId, {
      $pull: { friends: myId },
    });

    await FriendRequest.deleteMany({
      $or: [
        { sender: myId, recipient: friendId, status: "accepted" },
        { sender: friendId, recipient: myId, status: "accepted" },
      ],
    });

    res.status(200).json({ message: "Unfriended successfully" });
  } catch (error) {
    console.log("Error in unfriend controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function uploadPhoto(req, res) {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const base64Image = req.file.buffer.toString("base64");

    const imgbbRes = await fetch(
      `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
      {
        method: "POST",
        body: new URLSearchParams({ image: base64Image }),
      }
    );

    const data = await imgbbRes.json();

    if (data.success) {
      return res.json({ success: true, url: data.data.url });
    } else {
      return res
        .status(500)
        .json({ success: false, message: "ImgBB upload failed" });
    }
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function getUserProfile(req, res) {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const user = await User.findById(userId)
      .select("-password")
      .populate("friends", "fullName profilePic");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isFriend = user.friends.some(
      (friend) => friend._id.toString() === currentUserId
    );
    const isOwnProfile = userId === currentUserId;

    if (!isFriend && !isOwnProfile) {
      return res.status(200).json({
        _id: user._id,
        fullName: user.fullName,
        profilePic: user.profilePic,
        bio: user.bio,
        location: user.location,
        nativeLanguage: user.nativeLanguage,
        learningSkill: user.learningSkill,
        friends: user.friends,
      });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error in getUserProfile controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getUserStatistics(req, res) {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const user = await User.findById(userId).populate("friends", "_id");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isFriend = user.friends.some(
      (friend) => friend._id.toString() === currentUserId
    );
    const isOwnProfile = userId === currentUserId;

    if (!isFriend && !isOwnProfile) {
      return res.status(403).json({
        message: "You must be friends with this user to view their statistics",
      });
    }

    const Session = (await import("../models/Session.model.js")).default;

    const sessions = await Session.find({ user: userId });
    const totalSessions = sessions.length;

    const totalTimeSpent = sessions.reduce((total, session) => {
      if (session.endTime && session.startTime) {
        const duration = Math.floor(
          (new Date(session.endTime) - new Date(session.startTime)) / 1000
        );
        return total + duration;
      }
      return total;
    }, 0);

    const averageSessionDuration =
      totalSessions > 0 ? Math.floor(totalTimeSpent / totalSessions) : 0;

    const totalTasksCompleted = sessions.reduce((total, session) => {
      return total + session.tasks.filter((task) => task.isCompleted).length;
    }, 0);

    res.status(200).json({
      totalSessions,
      totalTimeSpent,
      averageSessionDuration,
      totalTasksCompleted,
    });
  } catch (error) {
    console.error("Error in getUserStatistics controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getUserSpaces(req, res) {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const user = await User.findById(userId).populate("friends", "_id");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isFriend = user.friends.some(
      (friend) => friend._id.toString() === currentUserId
    );
    const isOwnProfile = userId === currentUserId;

    if (!isFriend && !isOwnProfile) {
      return res.status(403).json({
        message: "You must be friends with this user to view their spaces",
      });
    }

    const Space = (await import("../models/Space.model.js")).default;

    const spaces = await Space.find({
      $or: [{ creator: userId }, { members: userId }],
    })
      .populate("creator", "fullName profilePic")
      .populate("members", "fullName profilePic")
      .sort({ createdAt: -1 });

    res.status(200).json(spaces);
  } catch (error) {
    console.error("Error in getUserSpaces controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
