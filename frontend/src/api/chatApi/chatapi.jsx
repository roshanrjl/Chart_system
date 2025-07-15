import axios from "axios";
import { LocalStorage } from "../../utils";

// Create Axios instance
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URI,
  withCredentials: true,
  timeout: 120000,
});

// Set token in request header automatically
apiClient.interceptors.request.use(
  function (config) {
    const token = LocalStorage.get("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  function (error) {
    return Promise.reject(error);
  }
);

// ✅ Chat API functions

export const addParticipantToGroup = (chatId, participantId) => {
  return apiClient.post(`/chats/group/${chatId}/${participantId}`);
};

export const createGroupChat = (groupData) => {
  return apiClient.post("/chats/group", groupData); // groupData should contain participants, name, etc.
};

export const createUserChat = (receiverId) => {
  return apiClient.post(`/chats/${receiverId}`);
};

export const deleteGroup = (chatId) => {
  return apiClient.delete(`/chats/group/${chatId}`);
};

export const deleteOneOnOneChat = (chatId) => {
  return apiClient.delete(`/chats/remove/${chatId}`);
};

export const getUserChats = () => {
  return apiClient.get("/chats",);
};

export const getGroupInfo = (chatId) => {
  return apiClient.get(`/chats/${chatId}`);
};

export const leaveGroupChat = (chatId) => {
  return apiClient.delete(`/chats/leave/group/${chatId}`);
};

export const removeParticipantFromGroup = (chatId, participantId) => {
  return apiClient.delete(`/chats/group/${chatId}/${participantId}`);
};

export const updateGroupName = (chatId, name) => {
  return apiClient.post(`/chats/group/${chatId}`, { name });
};

export const getAvailableUsers = () => {
  return apiClient.get("/chats/user");
};
