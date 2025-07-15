import { configureStore } from "@reduxjs/toolkit";
import authSlice from "./authSlice";
import socketSlice from "./socketSlice";

const store = configureStore({
  reducer: {
    authentication: authSlice,
    socket: socketSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // disable serializable check for socket instance
    }),
});

export default store;
