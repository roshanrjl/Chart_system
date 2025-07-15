// Load environment variables
import dotenv from "dotenv";

// Core modules and packages
import express from "express";
import http from "http";
import path from "path";
import { Server } from "socket.io";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";

// Custom modules
import { initializeSocketIo } from "./socket/index.js";
import UserRouter from "./routes/user.route.js";
import messageRouter from "./routes/message.route.js";
import chatRouter from "./routes/chat.routes.js";


// Load .env vars
dotenv.config();


const app = express();
const httpServer = http.createServer(app);

// CORS middleware - enable for all routes including OPTIONS preflight
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
}));


// Setup Socket.IO with CORS
const io = new Server(httpServer, {
  pingTimeout: 9000,
  cors: {
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  },
});
app.set("io", io);

// Other middlewares
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static(path.resolve('./public')));
app.use(cookieParser());

app.use(session({
  secret: process.env.EXPRESS_SESSION_SECRET || "fallback_secret",
  resave: true,
  saveUninitialized: true,
}));

// API routes
app.use('/api/v1/chart-app/chats', chatRouter);
app.use('/api/v1/chart-app/messages', messageRouter);
app.use('/api/v1/chart-app/user', UserRouter);

// Initialize socket.io handlers
initializeSocketIo(io);

// Export the server
export { httpServer ,app};
