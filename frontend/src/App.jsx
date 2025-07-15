import { Routes, Route, Navigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useEffect, useState } from "react";

import Login from "./pages/login";
import Register from "./pages/register";
import ChatPage from "./pages/chat";

import PrivateRoute from "./components/PrivateRoute";
import PublicRoute from "./components/PublicRoute";

import {
  connectionsocket,
  disconnectionsocket,
} from "./redux/socketSlice.jsx";

const App = () => {
  const { user } = useSelector((state) => state.authentication);
  const { socket } = useSelector((state) => state.socket);
  const dispatch = useDispatch();

  const [isSocketConnected, setIsSocketConnected] = useState(false);

  // 🚀 Connect socket when user logs in
  useEffect(() => {
    if (user?._id) {
      dispatch(connectionsocket());
    } else {
      // 🧹 Disconnect when user logs out
      dispatch(disconnectionsocket());
    }
  }, [user?._id, dispatch]);

  // ✅ Listen for connection status
  useEffect(() => {
    if (!socket) return;

    const onConnect = () => {
      console.log("✅ Socket connected with ID:", socket.id);
      setIsSocketConnected(true);
    };
    const onDisconnect = () => {
      console.log("❌ Socket disconnected");
      setIsSocketConnected(false);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);

  console.log("Socket connection status:", isSocketConnected);

  return (
    <Routes>
      <Route
        path="/"
        element={
          user?._id ? <Navigate to="/chat" /> : <Navigate to="/login" />
        }
      />

      <Route
        path="/chat"
        element={
          <PrivateRoute>
            <ChatPage socket={socket} />
          </PrivateRoute>
        }
      />

      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      <Route path="*" element={<p>404 Not found</p>} />
    </Routes>
  );
};

export default App;
