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
        { _id: { $ne: currentUserId } }, //exclude current user
        { _id: { $nin: currentUser.friends } }, //exclude current user's friends
        { _id: { $nin: senders } }, // exclude who already sent you a request
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

    // prevent sending req to yourself
    if (myId === recipientId) {
      return res
        .status(400)
        .json({ message: "You can't send friend request to yourself" });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    // check if user is already friends
    if (recipient.friends.includes(myId)) {
      return res
        .status(400)
        .json({ message: "You are already friends with this user" });
    }

    // check if a req already exists
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

    // Create notification for recipient
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

    // Verify the current user is the recipient
    if (friendRequest.recipient.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You are not authorized to accept this request" });
    }

    friendRequest.status = "accepted";
    await friendRequest.save();

    // add each user to the other's friends array
    // $addToSet: adds elements to an array only if they do not already exist.
    await User.findByIdAndUpdate(friendRequest.sender, {
      $addToSet: { friends: friendRequest.recipient },
    });

    await User.findByIdAndUpdate(friendRequest.recipient, {
      $addToSet: { friends: friendRequest.sender },
    });

    // Create notification for the sender
    await createNotification({
      recipient: friendRequest.sender,
      sender: friendRequest.recipient,
      type: "friend_request_accepted",
      message: `${req.user.fullName} accepted your friend request`,
    });

    // Delete the friend_request notification for the recipient
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

export async function markNotificationsSeen(req, res) {
  try {
    await FriendRequest.updateMany(
      {
        sender: req.user.id,
        status: "accepted",
        isNotificationSeen: { $ne: true },
      },
      { $set: { isNotificationSeen: true } }
    );

    res.status(200).json({ message: "Notifications marked as seen" });
  } catch (error) {
    console.log("Error in markNotificationsSeen controller", error.message);
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

    // Verify the current user is the recipient
    if (friendRequest.recipient.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You are not authorized to decline this request" });
    }

    // Delete the friend request
    await FriendRequest.findByIdAndDelete(requestId);

    // Delete the friend_request notification for the recipient
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

    // Verify the current user is the sender
    if (friendRequest.sender.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You are not authorized to cancel this request" });
    }

    // Delete the friend request
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

    // Check if they are friends
    const myUser = await User.findById(myId);
    const friendUser = await User.findById(friendId);

    if (!friendUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!myUser.friends.includes(friendId)) {
      return res.status(400).json({ message: "You are not friends with this user" });
    }

    // Remove from both users' friend lists
    await User.findByIdAndUpdate(myId, {
      $pull: { friends: friendId },
    });

    await User.findByIdAndUpdate(friendId, {
      $pull: { friends: myId },
    });

    // Delete the friend request record
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

    // Convert buffer to base64 string
    const base64Image = req.file.buffer.toString("base64");

    // Send to ImgBB
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
