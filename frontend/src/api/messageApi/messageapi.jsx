import axios from "axios";
import { LocalStorage } from "../../utils";

// Create the Axios instance
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URI,
  withCredentials: true,
  timeout: 120000,
});

// Attach token to headers
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



// Get messages for a specific chat
export const getChatMessages = (chatId) => {
  return apiClient.get(`/messages/${chatId}`);
};

// Send a new message (with optional files)
export const sendMessage = (chatId, content, files = []) => {
  const formData = new FormData();
  formData.append("content", content);
  files.forEach(file => formData.append("files", file));

  return apiClient.post(`/messages/${chatId}`, formData);
};

// Delete a specific message
export const deleteMessage = (chatId, messageId) => {
  return apiClient.delete(`/messages/${chatId}/${messageId}`);
};
