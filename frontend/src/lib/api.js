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
  } catch {
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

export async function getUserProfile(userId) {
  const response = await axiosInstance.get(`/users/profile/${userId}`);
  return response.data;
}

export async function getUserStatistics(userId) {
  const response = await axiosInstance.get(`/users/${userId}/statistics`);
  return response.data;
}

export async function getUserRooms(userId) {
  const response = await axiosInstance.get(`/users/${userId}/rooms`);
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

export async function getStreamToken() {
  const response = await axiosInstance.get("/chat/token");
  return response.data;
}

// Brings the caller's room and team channels in line with what they belong to.
export async function syncChatChannels() {
  const response = await axiosInstance.post("/chat/sync");
  return response.data;
}

export async function createRoom(spaceData) {
  const response = await axiosInstance.post("/rooms", spaceData);
  return response.data;
}

export async function getAllRooms() {
  const response = await axiosInstance.get("/rooms");
  return response.data;
}

export async function getMyRooms() {
  const response = await axiosInstance.get("/rooms/my-rooms");
  return response.data;
}

export async function getRoomById(roomId) {
  const response = await axiosInstance.get(`/rooms/${roomId}`);
  return response.data;
}

export async function requestToJoinRoom(roomId) {
  const response = await axiosInstance.post(`/rooms/${roomId}/request-join`);
  return response.data;
}

export async function approveJoinRequest(roomId, userId) {
  const response = await axiosInstance.post(`/rooms/${roomId}/approve`, {
    userId,
  });
  return response.data;
}

export async function rejectJoinRequest(roomId, userId) {
  const response = await axiosInstance.post(`/rooms/${roomId}/reject`, {
    userId,
  });
  return response.data;
}

export async function leaveRoom(roomId) {
  const response = await axiosInstance.delete(`/rooms/${roomId}/leave`);
  return response.data;
}

export async function deleteRoom(roomId) {
  const response = await axiosInstance.delete(`/rooms/${roomId}`);
  return response.data;
}

export async function createAnnouncement(roomId, announcementData) {
  const response = await axiosInstance.post(`/rooms/${roomId}/announcements`, announcementData);
  return response.data;
}

export async function deleteAnnouncement(roomId, announcementId) {
  const response = await axiosInstance.delete(`/rooms/${roomId}/announcements/${announcementId}`);
  return response.data;
}

export async function joinStream(roomId, streamData) {
  const response = await axiosInstance.post(`/rooms/${roomId}/streams/join`, streamData);
  return response.data;
}

export async function leaveStream(roomId) {
  const response = await axiosInstance.delete(`/rooms/${roomId}/streams/leave`);
  return response.data;
}

export async function removeFromStream(roomId, userId, reason) {
  const response = await axiosInstance.delete(`/rooms/${roomId}/streams/${userId}`, {
    data: { reason }
  });
  return response.data;
}

export async function uploadPhoto(file) {
  const formData = new FormData();
  formData.append("image", file);

  try {
    const response = await axiosInstance.post("/users/upload-photo", formData);
    return response.data;
  } catch {
    return null;
  }
}

export async function getNotifications(page = 1, limit = 20) {
  const response = await axiosInstance.get(`/notifications?page=${page}&limit=${limit}`);
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

export async function getUserSessions(userId) {
  const response = await axiosInstance.get(`/sessions/user/${userId}`);
  return response.data;
}

export async function getCurrentSession(roomId, userId = null) {
  const url = userId 
    ? `/sessions/current/${roomId}?userId=${userId}`
    : `/sessions/current/${roomId}`;
  const response = await axiosInstance.get(url);
  return response.data;
}

export async function updateSessionTask(sessionId, taskId, isCompleted) {
  const response = await axiosInstance.patch(`/sessions/${sessionId}/tasks/${taskId}`, { isCompleted });
  return response.data;
}

export async function getRoomSessionStats(roomId) {
  const response = await axiosInstance.get(`/sessions/room/${roomId}/stats`);
  return response.data;
}

export async function encourageParticipant(sessionId) {
  const response = await axiosInstance.post(`/sessions/${sessionId}/encourage`);
  return response.data;
}

export async function removeEncouragement(sessionId) {
  const response = await axiosInstance.delete(`/sessions/${sessionId}/encourage`);
  return response.data;
}

export async function startSoloSession(payload) {
  const response = await axiosInstance.post("/sessions/solo", payload);
  return response.data;
}

export async function getActiveSoloSession() {
  const response = await axiosInstance.get("/sessions/solo/active");
  // 204 means "no session running" — a normal state, not an error.
  return response.status === 204 ? null : response.data;
}

export async function completeSession({ sessionId, reflection }) {
  const response = await axiosInstance.post(`/sessions/${sessionId}/complete`, {
    reflection,
  });
  return response.data;
}

export async function heartbeatSession(sessionId) {
  const response = await axiosInstance.post(`/sessions/${sessionId}/heartbeat`);
  return response.data;
}

export async function addSessionTask(sessionId, title) {
  const response = await axiosInstance.post(`/sessions/${sessionId}/tasks`, {
    title,
  });
  return response.data;
}

export async function deleteSessionTask(sessionId, taskId) {
  const response = await axiosInstance.delete(
    `/sessions/${sessionId}/tasks/${taskId}`
  );
  return response.data;
}

export async function startBreak(sessionId) {
  const response = await axiosInstance.post(`/sessions/${sessionId}/break/start`);
  return response.data;
}

export async function endBreak(sessionId) {
  const response = await axiosInstance.post(`/sessions/${sessionId}/break/end`);
  return response.data;
}

export async function extendSession(sessionId, minutes) {
  const response = await axiosInstance.patch(`/sessions/${sessionId}/extend`, {
    minutes,
  });
  return response.data;
}

// ---- teams ----------------------------------------------------------------

export async function getMyTeams() {
  const response = await axiosInstance.get("/teams");
  return response.data;
}

export async function getTeamById(teamId) {
  const response = await axiosInstance.get(`/teams/${teamId}`);
  return response.data;
}

export async function createTeam(payload) {
  const response = await axiosInstance.post("/teams", payload);
  return response.data;
}

export async function deleteTeam(teamId) {
  const response = await axiosInstance.delete(`/teams/${teamId}`);
  return response.data;
}

export async function inviteToTeam(teamId, payload) {
  const response = await axiosInstance.post(`/teams/${teamId}/invites`, payload);
  return response.data;
}

export async function revokeInvite(teamId, token) {
  const response = await axiosInstance.delete(
    `/teams/${teamId}/invites/${token}`
  );
  return response.data;
}

export async function acceptTeamInvite(token) {
  const response = await axiosInstance.post("/teams/invites/accept", { token });
  return response.data;
}

export async function getPendingTeamInvites() {
  const response = await axiosInstance.get("/teams/invites/pending");
  return response.data;
}

export async function updateTeamMemberRole(teamId, userId, role) {
  const response = await axiosInstance.patch(
    `/teams/${teamId}/members/${userId}`,
    { role }
  );
  return response.data;
}

export async function removeTeamMember(teamId, userId) {
  const response = await axiosInstance.delete(
    `/teams/${teamId}/members/${userId}`
  );
  return response.data;
}

export async function upgradePlan() {
  const response = await axiosInstance.post("/teams/upgrade");
  return response.data;
}

export async function getLivePresence() {
  const response = await axiosInstance.get("/sessions/live");
  return response.data;
}
