import { axiosInstance } from "./axios";

export const signup = async (signupData) => {
  const response = await axiosInstance.post("/auth/signup", signupData);
  return response.data;
};

export const login = async (loginData) => {
  const response = await axiosInstance.post("/auth/login", loginData);
  return response.data;
};

export const logout = async () => {
  const response = await axiosInstance.post("/auth/logout");
  return response.data;
};

export const getAuthUser = async () => {
  try {
    const res = await axiosInstance.get("/auth/me");
    return res.data;
  } catch (error) {
    console.log("Error in getAuthUser:", error);
    return null;
  }
};

export const completeOnboarding = async (userData) => {
  const response = await axiosInstance.post("/auth/onboarding", userData);
  return response.data;
};

export async function getUserFriends() {
  const response = await axiosInstance.get("/users/friends");
  return response.data;
}

export async function getRecommendedUsers() {
  const response = await axiosInstance.get("/users");
  return response.data;
}

export async function getOutgoingFriendReqs() {
  const response = await axiosInstance.get("/users/outgoing-friend-requests");
  return response.data;
}

export async function sendFriendRequest(userId) {
  const response = await axiosInstance.post(`/users/friend-request/${userId}`);
  return response.data;
}

export async function getFriendRequests() {
  const response = await axiosInstance.get("/users/friend-requests");
  return response.data;
}

export async function acceptFriendRequest(requestId) {
  const response = await axiosInstance.put(
    `/users/friend-request/${requestId}/accept`
  );
  return response.data;
}

export async function declineFriendRequest(requestId) {
  const response = await axiosInstance.delete(
    `/users/friend-request/${requestId}/decline`
  );
  return response.data;
}

export async function cancelFriendRequest(requestId) {
  const response = await axiosInstance.delete(
    `/users/friend-request/${requestId}/cancel`
  );
  return response.data;
}

export async function unfriend(friendId) {
  const response = await axiosInstance.delete(`/users/unfriend/${friendId}`);
  return response.data;
}

export async function markNotificationsSeen() {
  const response = await axiosInstance.put("/users/notifications/mark-seen");
  return response.data;
}

export async function getStreamToken() {
  const response = await axiosInstance.get("/chat/token");
  return response.data;
}

// Spaces API
export async function createSpace(spaceData) {
  const response = await axiosInstance.post("/spaces", spaceData);
  return response.data;
}

export async function getAllSpaces() {
  const response = await axiosInstance.get("/spaces");
  return response.data;
}

export async function getMySpaces() {
  const response = await axiosInstance.get("/spaces/my-spaces");
  return response.data;
}

export async function getSpaceById(spaceId) {
  const response = await axiosInstance.get(`/spaces/${spaceId}`);
  return response.data;
}

export async function requestToJoinSpace(spaceId) {
  const response = await axiosInstance.post(`/spaces/${spaceId}/request-join`);
  return response.data;
}

export async function approveJoinRequest(spaceId, userId) {
  const response = await axiosInstance.post(`/spaces/${spaceId}/approve`, {
    userId,
  });
  return response.data;
}

export async function rejectJoinRequest(spaceId, userId) {
  const response = await axiosInstance.post(`/spaces/${spaceId}/reject`, {
    userId,
  });
  return response.data;
}

export async function leaveSpace(spaceId) {
  const response = await axiosInstance.delete(`/spaces/${spaceId}/leave`);
  return response.data;
}

export async function deleteSpace(spaceId) {
  const response = await axiosInstance.delete(`/spaces/${spaceId}`);
  return response.data;
}

// Sessions
export async function createSession(spaceId, sessionData) {
  const response = await axiosInstance.post(`/spaces/${spaceId}/sessions`, sessionData);
  return response.data;
}

export async function updateSessionStatus(spaceId, sessionId, statusData) {
  const response = await axiosInstance.patch(`/spaces/${spaceId}/sessions/${sessionId}`, statusData);
  return response.data;
}

// Announcements
export async function createAnnouncement(spaceId, announcementData) {
  const response = await axiosInstance.post(`/spaces/${spaceId}/announcements`, announcementData);
  return response.data;
}

export async function deleteAnnouncement(spaceId, announcementId) {
  const response = await axiosInstance.delete(`/spaces/${spaceId}/announcements/${announcementId}`);
  return response.data;
}

// Streams
export async function joinStream(spaceId, streamData) {
  const response = await axiosInstance.post(`/spaces/${spaceId}/streams/join`, streamData);
  return response.data;
}

export async function leaveStream(spaceId) {
  const response = await axiosInstance.delete(`/spaces/${spaceId}/streams/leave`);
  return response.data;
}

export async function updateGrindingTopic(spaceId, grindingTopic) {
  const response = await axiosInstance.patch(`/spaces/${spaceId}/streams/topic`, { grindingTopic });
  return response.data;
}

export async function toggleStreamMedia(spaceId, mediaSettings) {
  const response = await axiosInstance.patch(`/spaces/${spaceId}/streams/media`, mediaSettings);
  return response.data;
}

export async function removeFromStream(spaceId, userId) {
  const response = await axiosInstance.delete(`/spaces/${spaceId}/streams/${userId}`);
  return response.data;
}

export async function uploadPhoto(file) {
  const formData = new FormData();
  formData.append("image", file);

  try {
    const response = await axiosInstance.post("/users/upload-photo", formData);
    return response.data;
  } catch (err) {
    console.error("Frontend upload error:", err);
    return null;
  }
}

// Notifications API
export async function getNotifications() {
  const response = await axiosInstance.get("/notifications");
  return response.data;
}

export async function getUnreadCount() {
  const response = await axiosInstance.get("/notifications/unread-count");
  return response.data;
}

export async function markNotificationAsRead(notificationId) {
  const response = await axiosInstance.patch(`/notifications/${notificationId}/read`);
  return response.data;
}

export async function markAllNotificationsAsRead() {
  const response = await axiosInstance.patch("/notifications/read-all");
  return response.data;
}

export async function deleteNotification(notificationId) {
  const response = await axiosInstance.delete(`/notifications/${notificationId}`);
  return response.data;
}
