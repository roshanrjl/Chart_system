import { createSlice } from "@reduxjs/toolkit";
import { io } from "socket.io-client";
import { LocalStorage } from "../utils";

const initialState = {
  socket: null,
};

const socketSlice = createSlice({
  name: "socketslice",
  initialState,
  reducers: {
    connectionsocket: (state) => {
      // ✅ Prevent duplicate connection
      if (state.socket) return;

      const token = LocalStorage.get("token");

      const socket = io(import.meta.env.VITE_SOCKET_URI, {
        withCredentials: true,
        auth: { token },
      });

      state.socket = socket;
    },

    disconnectionsocket: (state) => {
      if (state.socket) {
        state.socket.disconnect();
        state.socket = null;
      }
    },
  },
});

export default socketSlice.reducer;
export const { connectionsocket, disconnectionsocket } = socketSlice.actions;

// recomanded method for socket is that create the different file for the socket connection such as socket.js and perform the connection in that file 
//for example  you create the socket.js the perform the following code inside that file 


// import { io } from "socket.io-client";
// import { LocalStorage } from "./utils";

// let socket = null;

// export const connectSocket = () => {
//   const token = LocalStorage.get("token");
//   socket = io(import.meta.env.VITE_SOCKET_URI, {
//     withCredentials: true,
//     auth: { token },
//   });
// };

// export const disconnectSocket = () => {
//   if (socket) {
//     socket.disconnect();
//     socket = null;
//   }
// };

// export const getSocket = () => socket;
// import the function in the respecitive file to use the socket