import React, { useState } from "react";
import { useSelector } from "react-redux";
import {
  EllipsisVerticalIcon,
  PaperClipIcon,
  TrashIcon,
} from "@heroicons/react/20/solid";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import moment from "moment";
import { deleteOneOnOneChat } from "../../api/chatApi/chatapi.jsx";
import { classNames, getChatObjectMetadata, requestHandler } from "../../utils/index.js";
import GroupChatDetailsModal from "./GroupChatDetailsModal";

const ChatItem = ({ chat, onClick, isActive, unreadCount = 0, onChatDelete }) => {
  const user = useSelector((state) => state.authentication.user);

  const [openOptions, setOpenOptions] = useState(false);
  const [openGroupInfo, setOpenGroupInfo] = useState(false);

  const deleteChat = async () => {
    await requestHandler(
      async () => await deleteOneOnOneChat(chat._id),
      null,
      () => {
        onChatDelete(chat._id);
      },
      alert
    );
  };

  if (!chat) return null;

  const chatMeta = getChatObjectMetadata(chat, user);

  return (
    <>
      <GroupChatDetailsModal
        open={openGroupInfo}
        onClose={() => setOpenGroupInfo(false)}
        chatId={chat._id}
        onGroupDelete={onChatDelete}
      />
      <div
        role="button"
        onClick={() => onClick(chat)}
        onMouseLeave={() => setOpenOptions(false)}
        className={classNames(
          "group p-4 my-2 flex justify-between gap-3 items-start cursor-pointer rounded-3xl hover:bg-secondary",
          isActive ? "border-[1px] border-zinc-500 bg-secondary" : "",
          unreadCount > 0
            ? "border-[1px] border-success bg-success/20 font-bold"
            : ""
        )}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpenOptions(!openOptions);
          }}
          className="self-center p-1 relative"
        >
          <EllipsisVerticalIcon className="h-6 group-hover:w-6 group-hover:opacity-100 w-0 opacity-0 transition-all ease-in-out duration-100 text-zinc-300" />
          <div
            className={classNames(
              "z-20 text-left absolute bottom-0 translate-y-full text-sm w-52 bg-dark rounded-2xl p-2 shadow-md border-[1px] border-secondary",
              openOptions ? "block" : "hidden"
            )}
          >
            {chat.isGroupChat ? (
              <p
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenGroupInfo(true);
                }}
                role="button"
                className="p-4 w-full rounded-lg inline-flex items-center hover:bg-secondary"
              >
                <InformationCircleIcon className="h-4 w-4 mr-2" /> About group
              </p>
            ) : (
              <p
                onClick={(e) => {
                  e.stopPropagation();
                  const ok = window.confirm(
                    "Are you sure you want to delete this chat?"
                  );
                  if (ok) {
                    deleteChat();
                  }
                }}
                role="button"
                className="p-4 text-danger rounded-lg w-full inline-flex items-center hover:bg-secondary"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Delete chat
              </p>
            )}
          </div>
        </button>

        {/* Avatar */}
        <div className="flex justify-center items-center flex-shrink-0">
          {chat.isGroupChat ? (
            <div className="w-12 relative h-12 flex-shrink-0 flex justify-start items-center flex-nowrap">
              {chat.participants.slice(0, 3).map((participant, i) =>
                participant.profileImage ? (
                  <img
                    key={participant._id}
                    src={participant.profileImage}
                    className={classNames(
                      "w-8 h-8 border-[1px] border-white rounded-full absolute outline outline-4 outline-dark group-hover:outline-secondary",
                      i === 0
                        ? "left-0 z-[3]"
                        : i === 1
                        ? "left-2.5 z-[2]"
                        : i === 2
                        ? "left-[18px] z-[1]"
                        : ""
                    )}
                    alt={`${participant.username} avatar`}
                  />
                ) : (
                  <div
                    key={participant._id}
                    className={classNames(
                      "w-8 h-8 bg-gray-400 rounded-full absolute",
                      i === 0
                        ? "left-0 z-[3]"
                        : i === 1
                        ? "left-2.5 z-[2]"
                        : i === 2
                        ? "left-[18px] z-[1]"
                        : ""
                    )}
                    title={participant.username}
                  />
                )
              )}
            </div>
          ) : chatMeta.avatar ? (
            <img
              src={chatMeta.avatar}
              className="w-12 h-12 rounded-full"
              alt="chat avatar"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-300" />
          )}
        </div>

        {/* Text content */}
        <div className="w-full">
          <p className="truncate-1 text-black font-semibold">{chatMeta.title}</p>
          <div className="w-full inline-flex items-center text-left">
            {chat.lastMessage && chat.lastMessage.attachments.length > 0 ? (
              <PaperClipIcon className="text-black h-3 w-3 mr-2 flex flex-shrink-0" />
            ) : null}
            <small className="truncate-1 text-sm text-ellipsis inline-flex items-center text-black">
              {chatMeta.lastMessage}
            </small>
          </div>
        </div>

        {/* Timestamp & unread */}
        <div className="flex text-black h-full text-sm flex-col justify-between items-end">
          <small className="mb-2 inline-flex flex-shrink-0 w-max">
            {moment(chat.updatedAt).fromNow(true)}
          </small>
          {unreadCount > 0 ? (
            <span className="bg-success h-2 w-2 aspect-square flex-shrink-0 p-2 text-white text-xs rounded-full inline-flex justify-center items-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </div>
      </div>
    </>
  );
};

export default ChatItem;
