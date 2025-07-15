import axios from "axios";
import { LocalStorage } from "../../utils";

// Create the Axios instance for API requests
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URI,
  withCredentials: true,
  timeout: 120000,
});

// Add an interceptor to set authorization header with user token before requests
apiClient.interceptors.request.use(
  function (config) {
    // Retrieve user token from local storage
    const token = LocalStorage.get("token");
    // Set authorization header with bearer token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  function (error) {
    return Promise.reject(error);
  }
);

// API functions for different actions

export const registerUser = (formData) => {
  return apiClient.post("/user/register", formData,);
};

export const loginUser = (data) => {
  return apiClient.post("/user/login", data, {
    withCredentials: true, 
  });
};

export const logoutUser = () => {
  return apiClient.post("/user/logout", {}, { withCredentials: true });
};

export const getCurrentUser = () => {
  return apiClient.get("/user/getCurrentUser");
};

export const updateAccountDetails = (username) => {
  return apiClient.patch("/user/updateAccountDetails", { username });
};

export const changeCurrentPassword = (data) => {
  return apiClient.patch("/user/changeCurrentPassword", data);
};

export const changeProfileImage = (data) => {
  return apiClient.patch("/user/changeProfileImage", data);
};
