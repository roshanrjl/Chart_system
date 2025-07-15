import { User } from "../models/user.model.js";
import { Chat } from "../models/chat.model.js";
import { ChatMessage } from "../models/message.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ChatEventEnum } from "../constants.js";
import { emitSocketEvent } from "../socket/index.js";
import { removeLocalFile } from "../utils/helper.js";

const chartCommonAggregration = async () => {
  return [
    {
      $lookup: {
        from: "users",
        localField: "participaints",
        foreignField: "_id",
        as: "participaints",
        pipeline: [
          {
            $project: {
              password: 0,
              refreshToken: 0,
            },
          },
        ],
      },
    },
    //lookup for group chart
    {
      $lookup: {
        from: "chatMessages",
        localField: "lastMessage",
        foreignField: "_id",
        as: "lastMessage",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "sender",
              foreignField: "_id",
              as: "sender",
              pipeline: [
                {
                  $project: {
                    password: 0,
                    refreshToken: 0,
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      $addFields: {
        lastMessage: { $first: "$lastMessage" },
      },
    },
  ];
};

// utility function responsible for removing all the messages and file attachments attached to the deleted chat

const deleteCascadeChatMessages = async (chatId) => {
  const messages = await ChatMessage.find({
    chat: new mongoose.Types.ObjectId(chatId),
  });
  let attachments = [];
  attachments = attachments.concat(
    ...messages.map((message) => {
      return message.attachments;
    })
  );

  attachments.forEach((attachment) => {
    // remove attachment files from the local storage
    removeLocalFile(attachment.localPath);
  });

  await ChatMessage.deleteMany({
    chat: new mongoose.Types.ObjectId(chatId),
  });
};

//finding all the user with username and profileImage accet the one who is logged in
const searchAvaiableUser = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: {
          $ne: req.user._id, //yas la afu bayak sabi user return garxa
        },
      },
    },
    {
      $project: {
        username: 1,
        profileImage: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, user, "user searched successfully"));
});
//controller for getting one to one chat
const createOrGetAOneOnOneChat = asyncHandler(async (req, res) => {
  const { receiverId } = req.params;

  if (!receiverId) {
    throw new ApiError(400, " could not find the receiverId");
  }
  const receiver = await User.findById(receiverId);
  if (!receiver) {
    throw new ApiError(400, "could not found the receiver");
  }
  if (receiver._id.toString() === req.user._id.toString()) {
    throw new ApiError(403, "cannot perform communication with yourself");
  }
  const chart = await Chat.aggregate([
    {
      $match: {
        isGroupChat: false,
        $and: [
          {
            participaints: {
              $elemMatch: { $eq: req.user._id },
            },
          },
          {
            participaints: {
              $elemMatch: { $eq: new mongoose.Types.ObjectId(receiverId) },
            },
          },
        ],
      },
    },
   ...(await chartCommonAggregration()),
  ]);
  if (chart.length) {
    return res
      .status(200)
      .json(new ApiResponse(200, chart[0], " existing Chat retrieved successfully"));
  }

  const newChatInstance = await Chat.create({
    name: "one to one chart",
    isGroupChat: false,
    participaints: [req.user._id, new mongoose.Types.ObjectId(receiverId)],
    admin: req.user._id,
  });

  const createdChat = await Chat.aggregate([
    {
      $match: {
        _id: newChatInstance._id,
      },
    },
   ...(await chartCommonAggregration()),
  ]);

  const payload = createdChat[0];
  console.log("checking data:",createdChat)
  console.log("checking payload:",payload)
  if (!payload) {
    throw new ApiError(500, "Internal server error");
  }
  payload?.participaints?.forEach((participaint) => {
    if (participaint._id.toString() === req.user._id.toString()) return;
    emitSocketEvent(
      req,
      participaint._id?.toString(),
      ChatEventEnum.NEW_CHAT_EVENT,
      payload
    );
  });
  return res
    .status(201)
    .json(new ApiResponse(201, payload, "new chat created successfully"));
});
//controller for creting the groupchart
const creteGroupChart = asyncHandler(async (req, res) => {
  const { name, participants } = req.body;

  if (!name || !participants) {
    throw new ApiError(400, "name of group or participaint didn't found");
  }
  if (participants.includes(req.user._id.toString())) {
    throw new ApiError(
      400,
      "the participaint should not contain the group creator"
    );
  }

  const members = [...new Set([...participants, req.user._id.toString()])];
  if (members.length < 3) {
    throw new ApiError(400, "group should contain atlest 3 membber");
  }
  const groupChat = await Chat.create({
    name,
    isGroupChat: true,
    participants: members,
    admin: req.user._id,
  });
  const chat = await Chat.aggregate([
    {
      $match: {
        _id: groupChat._id,
      },
    },
    ...(await chartCommonAggregration()),
  ]);

  const payload = chat[0];

  if (!payload) {
    throw new ApiError(500, "Internal server error");
  }

  payload?.participants?.forEach((participant) => {
    if (participant._id.toString() === req.user._id.toString()) return;
    emitSocketEvent(
      req,
      participant._id?.toString(),
      ChatEventEnum.NEW_CHAT_EVENT,
      payload
    );
  });

  return res
    .status(201)
    .json(new ApiResponse(201, payload, "Group chat created successfully"));
});
//controller for getting the group details
const getGroupChatDetails = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  if (!chatId) {
    throw new ApiError(400, "chatid didnot found");
  }
  const groupdetails = await Chat.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(chatId),
        isGroupChat: true,
      },
    },
    ...(await chartCommonAggregration()),
  ]);
  const chat = groupdetails[0];

  if (chat) {
    throw new ApiError(400, "did not fountd group details");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, chat, "group details fetched successfully"));
});
//controller for changing the group name
const renameGroupChat = asyncHandler(async (req, res) => {
  const { names } = req.body;
  const { chatid } = req.params;
  const user = req.user._id;

  if (!names || !chatid) {
    throw new ApiResponse(400, "name of chatid didn't found ");
  }
  const findgroup = await Chat.findById(chatid);

  if (findgroup.admin.toString() !== user.toString()) {
    throw new ApiError(
      403,
      "invald user !! only admin have access to change the name of group"
    );
  }
  const updategroup = await Chat.findByIdUpdate(
    chatid,
    {
      $set: {
        name: names,
      },
    },
    {
      new: true,
    }
  );
  const chat = await Chat.aggregate([
    {
      $match: {
        _id: updategroup._id,
      },
    },
...(await chartCommonAggregration()),
  ]);

  const payload = chat[0];

  if (!payload) {
    throw new ApiError(500, "Internal server error");
  }
  payload?.participaints.forEach((participaint) => {
    emitSocketEvent(
      req,
      participaint._id?.toString(),
      ChatEventEnum.UPDATE_GROUP_NAME_EVENT,
      payload
    );
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, chat[0], "Group chat name updated successfully")
    );
});
//controller fro deleting the group
const deleteGroupChat = asyncHandler(async (req, res) => {
  const { chatid } = req.params;
  if (!chatid) {
    throw new ApiError(400, "could not found the chartid");
  }
  const chatgroup = await Chat.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(chatid),
        isGroupChat: true,
      },
    },
   ...(await chartCommonAggregration()),
  ]);
  const chat = chatgroup[0];
  if (!chat) {
    throw new ApiError(400, "group didnot found");
  }
  if (chat.admin.toString() !== req.user._id.toString()) {
    throw new ApiError(400, "only admin have access to delete the group");
  }

  await Chat.findByIdAndDelete(chatid);

  await deleteCascadeChatMessages(chatid);
  chat?.participaints?.forEach((participaint) => {
    if (participaint._id.toString() === req.user._id.toString()) return;

    emitSocketEvent(
      req,
      participaint._id.toString(),
      ChatEventEnum.LEAVE_CHAT_EVENT,
      chat
    );
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Group chat deleted successfully"));
});
//controller for removing the one-one chat
const deleteOneOnOneChat = asyncHandler(async (req, res) => {
  const { receiverId } = req.params;

  if (!receiverId) {
    throw new ApiError(400, " could not find the receiverId");
  }
  const receiver = await User.findById(receiverId);
  if (!receiver) {
    throw new ApiError(400, "could not found the receiver");
  }
  if (receiver._id.toString() === req.user._id.toString()) {
    throw new ApiError(403, "cannot perform communication with yourself");
  }

  const chatoneonone = await Chat.aggregate([
    {
      $match: {
        isGroupChat: false,
        $and: [
          {
            participaints: {
              $elemMatch: { $eq: req.user._id },
            },
          },
          {
            participaints: {
              $elemMatch: { $eq: new mongoose.Types.ObjectId(receiverId) },
            },
          },
        ],
      },
    },
 ...(await chartCommonAggregration()),
  ]);

  const chat = chatoneonone[0];
  if (!chat) {
    throw new ApiError(400, "chat didnot found");
  }
  await Chat.findByIdAndDelete(chat._id);

  await deleteCascadeChatMessages(chat._id);

  const otherParticipant = chat?.participants?.find(
    (participant) => participant?._id.toString() !== req.user._id.toString() // get the other participant in chat for socket
  );
  emitSocketEvent(
    req,
    otherParticipant._id?.toString(),
    ChatEventEnum.LEAVE_CHAT_EVENT,
    chat
  );

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Chat deleted successfully"));
});

//controller for leving the group chat
const leaveGroupChat = asyncHandler(async (req, res) => {
  const { chatid } = req.params;

  if (!chatid) {
    throw new ApiError(400, "could not find the chatid");
  }
  const groupChat = await Chat.findOne({
    _id: new mongoose.Types.ObjectId(chatId),
    isGroupChat: true,
  });

  if (!groupChat) {
    throw new ApiError(404, "Group chat does not exist");
  }

  if (groupChat.participaints.includes(req.user._id)) {
    throw new ApiError(
      400,
      "could not found the current user inside the group"
    );
  } else {
    updatedGroup = await findByIdAndUpdate(
      chatid,
      {
        $pull: {
          participants: req.user?._id,
        },
      },
      { new: true }
    );
  }
  const chat = await Chat.aggregate([
    {
      $match: {
        _id: updatedChat._id,
      },
    },
    ...(await chartCommonAggregration()),
  ]);
  const payload = chat[0];

  if (!payload) {
    throw new ApiError(500, "Internal server error");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, payload, "Left a group successfully"));
});
//add new member to the group chat
const addNewParticipantInGroupChat = asyncHandler(async (req, res) => {
  
  const { chatId, participaintId } = req.params;

  if (!chatId || !participaintId) {
    throw new ApiError(400, "Could not find provided ID");
  }

  const groupChat = await Chat.findOne({
    _id: new mongoose.Types.ObjectId(chatId),
    isGroupChat: true,
  });

  if (!groupChat) {
    throw new ApiError(400, "Could not find the group");
  }

  if (groupChat.admin.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only admin has the right to add a new member");
  }

  const existingParticipants = groupChat.participaints;

  if (existingParticipants?.includes(participaintId)) {
    throw new ApiError(409, "Participant already in a group chat");
  }

  const addmember = await Chat.findByIdAndUpdate(
    chatId,
    { $push: { participaints: participaintId } },
    { new: true }
  );

  const chat = await Chat.aggregate([
    { $match: { _id: addmember._id } },
    ...(await chartCommonAggregration()),
  ]);

  const payload = chat[0];

  if (!payload) {
    throw new ApiError(500, "Internal server error");
  }

  payload.participaints.forEach((member) => {
    if (member._id.toString() === req.user._id.toString()) return;

    emitSocketEvent(
      req,
      member._id.toString(),
      ChatEventEnum.JOIN_CHAT_EVENT,
      payload
    );
  });

  return res
    .status(200)
    .json(new ApiResponse(200, payload, "New member added successfully"));
});

//controller for removing the member from the group char
const removeParticipantFromGroupChat = asyncHandler(async (req, res) => {
  const { chatId, participaintId } = req.params;

  if (!chatId || !participaintId) {
    throw new ApiError(400, "Could not find provided ID");
  }

  const groupChat = await Chat.findOne({
    _id: new mongoose.Types.ObjectId(chatId),
    isGroupChat: true,
  });

  if (!groupChat) {
    throw new ApiError(400, "Could not find the group");
  }

  if (groupChat.admin.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only admin has the right to remove members");
  }

  const existingParticipants = groupChat.participaints;

  if (!existingParticipants?.some(id => id.toString() === participaintId)) {
    throw new ApiError(409, "Participant does not exist in the group chat");
  }

  const removemember = await Chat.findByIdAndUpdate(
    chatId,
    { $pull: { participaints: participaintId } },
    { new: true }
  );

  const chat = await Chat.aggregate([
    { $match: { _id: removemember._id } },
   ...(await chartCommonAggregration()),
  ]);

  const payload = chat[0];

  if (!payload) {
    throw new ApiError(500, "Internal server error");
  }

  // Notify the removed user
  emitSocketEvent(
    req,
    participaintId,
    ChatEventEnum.LEAVE_CHAT_EVENT,
    payload
  );

  // Notify other group members
  payload.participaints.forEach((member) => {
    if (member._id.toString() === req.user._id.toString()) return;

    emitSocketEvent(
      req,
      member._id.toString(),
      ChatEventEnum.LEAVE_CHAT_EVENT,
      payload
    );
  });

  return res
    .status(200)
    .json(new ApiResponse(200, payload, "Member removed successfully"));
});


const getAllChats = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user._id);

  const chats = await Chat.aggregate([
    {
      $match: {
        participaints: { $elemMatch: { $eq: userId } },
      },
    },
    {
      $sort: {
        updatedAt: -1,
      },
    },
    ...(await chartCommonAggregration()),
    {
      $addFields: {
        participaints: {
          $filter: {
            input: "$participaints",
            as: "participant",
            cond: { $ne: ["$$participant._id", userId] },
          },
        },
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, chats, "User chats fetched successfully!"));
});


export {
  addNewParticipantInGroupChat,
  creteGroupChart,
  createOrGetAOneOnOneChat,
  deleteGroupChat,
  deleteOneOnOneChat,
  getAllChats,
  getGroupChatDetails,
  leaveGroupChat,
  removeParticipantFromGroupChat,
  renameGroupChat,
  searchAvaiableUser,
}; 