import cookie from "cookie";
import jwt from "jsonwebtoken";

import {  ChatEventEnum } from "../constants.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";

const initializeSocketIo = (io) => {
  return io.on("connection", async (socket) => {
    try {
      const cookies = cookie.parse(socket.handshake.headers?.cookie || "");
      const token = cookies?.accessToken;
      if (!token) {
        token = socket.handshake.auth?.token;
      }

      if (!token) {
        throw new ApiError(40, "unauthorized handshake !! token is missing");
      }

      const decodetoken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

      const user = await User.findById(decodetoken._id).select(
        " -password -refreshToken"
      );

      if (!user) {
        throw new ApiError(401, "unauthorized handshake !! token is invalid");
      }

      socket.user = user;
      socket.join(user._id.toString());
      socket.emit(ChatEventEnum.CONNECTED_EVENT);
      console.log("User connected 🗼. userId: ", user._id.toString());

      mountJoinChatEvent(socket);
      mountParticipantTypingEvent(socket);
      mountParticipantStoppedTypingEvent(socket);

      
      socket.on(ChatEventEnum.DISCONNECT_EVENT, () => {
        console.log("user has disconnected 🚫. userId: " + socket.user?._id);
        if (socket.user?._id) {
          socket.leave(socket.user._id);
        }
      });


    } catch (error) {
      socket.emit(
        ChatEventEnum.SOCKET_ERROR_EVENT,
        error?.message || "Something went wrong while connecting to the socket."
      );
    }
  });
};


const mountParticipantStoppedTypingEvent = async(socket)=>{
    socket.on(ChatEventEnum.STOP_TYPING_EVENT, (chatid)=>{
    socket.in(chatid).emit(ChatEventEnum.STOP_TYPING_EVENT,chatid)
    })

}

const  mountParticipantTypingEvent = async(socket)=>{
    socket.on(ChatEventEnum.TYPING_EVENT,(chatid)=>{
        socket.in(chatid).emit(ChatEventEnum.TYPING_EVENT, chatid)
    })
}

const  mountJoinChatEvent = async(socket)=>{
    socket.on(ChatEventEnum.JOIN_CHAT_EVENT ,(chatid)=>{
        socket.join(chatid)
    })
}



const emitSocketEvent = (req, roomId, event, payload) => {
  req.app.get("io").in(roomId).emit(event, payload);
};

export { initializeSocketIo, emitSocketEvent };
