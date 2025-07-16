import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { Chat } from "../models/chat.model.js";
import { ChatMessage } from "../models/message.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { emitSocketEvent } from "../socket/index.js";
import { removeLocalFile } from "../utils/helper.js";
import { ChatEventEnum } from "../constants.js";
import client from "../redis/client.js";


const chatMessageCommonAggregation = () => {
  return [
    {
      $lookup: {
        from: "users",
        localField: "sender",
        foreignField: "_id",
        as: "sender",
        pipeline: [
          {
            $project: {
              username: 1,
              profileImage: 1,
              email: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        sender: { $first: "$sender" },
      },
    },
  ];
};
//controller for getting all the message
const getAllMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  if (!chatId) {
    throw new ApiError(400, "Chat ID not provided");
  }

  const selectChat = await Chat.findById(chatId).select("participaints");

  if (!selectChat) {
    throw new ApiError(404, "Chat not found");
  }

  // Check if current user is part of the chat
  if (
    !selectChat.participaints ||
    !selectChat.participaints.some(
      (participantId) => participantId.toString() === req.user._id.toString()
    )
  ) {
    throw new ApiError(403, "User is not a part of this chat");
  }

  // Fetch messages for the chat with sender info
  const messages = await ChatMessage.aggregate([
    {
      $match: {
        chat: new mongoose.Types.ObjectId(chatId),
      },
    },
    ...chatMessageCommonAggregation(),
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);

  return res.status(200).json(
    new ApiResponse(200, messages || [], "Messages fetched successfully")
  );
});


//controller for sending the message
const sendMessage = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { content } = req.body;



  if (!content && !req.files?.attachments?.length) {
    throw new ApiError(400, "content or attachments are required");
  }

  const findchat = await Chat.findById(chatId);
  if (!findchat) {
    throw new ApiError(400, "chat could not found");
  }

  const messageFiles = [];

  if (req.files && req.files.attachments?.length > 0) {
    req.files.attachments.forEach((attachment) => {
      messageFiles.push({
        url: getStaticFilePath(req, attachment.filename),
        localPath: getLocalPath(attachment.filename),
      });
    });
  }
 
  // Create the message instance with metadata
  const message = await ChatMessage.create({
    sender: new mongoose.Types.ObjectId(req.user._id),
    content: content || "",
    chat: new mongoose.Types.ObjectId(chatId),
    attachments: messageFiles,
  });

  // Update last message in the chat (no select here)
  await Chat.findByIdAndUpdate(
    chatId,
    {
      $set: { lastMessage: message._id },
    },
    { new: true }
  );

  // Fetch fresh chat document with participaints
  const chat = await Chat.findById(chatId).select("participaints");

  // Get the full populated message
  const messages = await ChatMessage.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(message._id),
      },
    },
    ...chatMessageCommonAggregation(),
  ]);

  const receivedMessage = messages[0];
  if (!receivedMessage) {
    throw new ApiError(500, "Internal server error");
  }

  await client.publish(`chat_${chatId}`,JSON.stringify(receivedMessage))
  // Emit socket event to all participaints except sender
    if (chat.participaints?.length) {
    chat.participaints.forEach((participantObjectId) => {
      if (participantObjectId.toString() === req.user._id.toString()) return;
      emitSocketEvent(
        req,
        participantObjectId.toString(),
        ChatEventEnum.MESSAGE_RECEIVED_EVENT,
        receivedMessage
      );
    });
  } else {
    console.log("Warning: chat.participaints is missing or empty");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, receivedMessage, "Message saved successfully"));
});

const deleteMessage = asyncHandler(async (req, res) => {
  const { chatId, messageId } = req.params;

  const chat = await Chat.findOne({
    _id: new mongoose.Types.ObjectId(chatId),
    participants: req.user?._id,
  });

  if (!chat) {
    throw new ApiError(404, "Chat does not exist");
  }

  const message = await ChatMessage.findOne({
    _id: new mongoose.Types.ObjectId(messageId),
  });

  if (!message) {
    throw new ApiError(404, "Message does not exist");
  }

  if (message.sender.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "You are not the authorised to delete the message, you are not the sender"
    );
  }

  if (message.attachments.length > 0) {
    //If the message is attachment  remove the attachments from the server
    message.attachments.map((asset) => {
      removeLocalFile(asset.localpath);
    });
  }

  await ChatMessage.deleteOne({
    _id: new mongoose.Types.ObjectId(messageId),
  });

  if (chat.lastMessage.toString() === message._id.toString()) {
    const lastMessage = await ChatMessage.findOne(
      { chat: chatId },
      {},
      { sort: { createdAt: -1 } }
    );

    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: lastMessage ? lastMessage?._id : null,
    });
  }
  chat.participants.forEach((participantObjectId) => {
    if (participantObjectId.toString() === req.user._id.toString()) return;

    emitSocketEvent(
      req,
      participantObjectId.toString(),
      ChatEventEnum.MESSAGE_DELETE_EVENT,
      message
    );
  });

  return res
    .status(200)
    .json(new ApiResponse(200, message, "Message deleted successfully"));
});

export { getAllMessages, sendMessage, deleteMessage };
