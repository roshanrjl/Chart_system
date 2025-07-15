import {
  PaperAirplaneIcon,
  PaperClipIcon,
  XCircleIcon,
} from "@heroicons/react/20/solid";
import { useEffect, useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";

import {
  deleteMessage,
  getChatMessages,
  sendMessage,
} from "../api/messageApi/messageapi.jsx";
import { getUserChats } from "../api/chatApi/chatapi.jsx";

import AddChatModal from "../components/chats/addChatModel.jsx";
import ChatItem from "../components/chats/chatItem.jsx";
import MessageItem from "../components/chats/messageItem.jsx";
import Typing from "../components/components/ui/Typing.jsx";
import Input from "../components/input.jsx";

import {
  LocalStorage,
  getChatObjectMetadata,
  requestHandler,
} from "../utils";

import { logout } from "../redux/authSlice";

const SOCKET_EVENTS = {
  CONNECTED: "connected",
  DISCONNECT: "disconnect",
  JOIN: "joinChat",
  NEW_CHAT: "newChat",
  TYPING: "typing",
  STOP_TYPING: "stopTyping",
  MESSAGE_RECEIVED: "messageReceived",
  LEAVE: "leaveChat",
  UPDATE_GROUP_NAME: "updateGroupName",
  MESSAGE_DELETE: "messageDeleted",
};

const ChatPage = ({ socket }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.authentication.user);

  const [currentChat, setCurrentChat] = useState(null);
  const typingTimeoutRef = useRef(null);

  const [isConnected, setIsConnected] = useState(false);
  const [openAddChat, setOpenAddChat] = useState(false);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState([]);

  const [isTyping, setIsTyping] = useState(false);
  const [selfTyping, setSelfTyping] = useState(false);

  const [message, setMessage] = useState("");
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [attachedFiles, setAttachedFiles] = useState([]);

  // Fetch user chats
  const getChats = () => {
    requestHandler(
      getUserChats,
      setLoadingChats,
      (res) => setChats(res.data || []),
      alert
    );
  };

  // Fetch messages for a chat
  const getMessages = (chatId) => {
    if (!chatId || !socket) {
      console.warn("No chat selected or socket unavailable");
      return;
    }

    socket.emit(SOCKET_EVENTS.JOIN, chatId);
    setUnreadMessages((prev) => prev.filter((m) => m.chat !== chatId));

    requestHandler(
      () => getChatMessages(chatId),
      setLoadingMessages,
      (res) => setMessages(res.data || []),
      alert
    );
  };

  // Update chat's last message in local state
  const updateChatLastMessage = (chatId, newMessage) => {
    setChats((prev) => {
      const rest = prev.filter((c) => c._id !== chatId);
      const chat = prev.find((c) => c._id === chatId);
      if (chat) {
        chat.lastMessage = newMessage;
        chat.updatedAt = newMessage.updatedAt;
        return [chat, ...rest];
      }
      return prev;
    });
  };

  // Send a message
  const sendChatMessage = () => {
    const chatId = currentChat?._id;
    if (!chatId || !socket) return;

    socket.emit(SOCKET_EVENTS.STOP_TYPING, chatId);

    requestHandler(
      () => sendMessage(chatId, message, attachedFiles),
      null,
      (res) => {
        setMessages((m) => [res.data, ...m]);
        updateChatLastMessage(chatId, res.data);
        setMessage("");
        setAttachedFiles([]);
      },
      alert
    );
  };

  // Delete a message
  const deleteChatMessage = (msg) => {
    requestHandler(
      () => deleteMessage(msg.chat, msg._id),
      null,
      (res) => {
        setMessages((m) => m.filter((x) => x._id !== res.data._id));
        updateChatLastMessage(msg.chat, msg);
      },
      alert
    );
  };

  // Typing handler
  const handleTyping = (e) => {
    setMessage(e.target.value);
    if (!socket || !isConnected || !currentChat?._id) return;

    if (!selfTyping) {
      socket.emit(SOCKET_EVENTS.TYPING, currentChat._id);
      setSelfTyping(true);
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit(SOCKET_EVENTS.STOP_TYPING, currentChat._id);
      setSelfTyping(false);
    }, 3000);
  };

  const onConnect = () => setIsConnected(true);
  const onDisconnect = () => setIsConnected(false);

  // When a new message is received
  const onMessageReceive = (msg) => {
    if (msg.chat === currentChat?._id) {
      setMessages((m) => [msg, ...m]);
    } else {
      setUnreadMessages((u) => [msg, ...u]);
    }
    updateChatLastMessage(msg.chat, msg);
  };

  const onChatLeave = (chat) => {
    if (chat._id === currentChat?._id) {
      setCurrentChat(null);
      LocalStorage.remove("currentChat");
      setMessages([]);
    }
    setChats((prev) => prev.filter((c) => c._id !== chat._id));
  };

  const onGroupNameChange = (updatedChat) => {
    if (updatedChat._id === currentChat?._id) {
      setCurrentChat(updatedChat);
      LocalStorage.set("currentChat", updatedChat);
    }
    setChats((prev) =>
      prev.map((c) => (c._id === updatedChat._id ? updatedChat : c))
    );
  };

  const onMessageDelete = (deletedMsg) => {
    if (deletedMsg.chat === currentChat?._id) {
      setMessages((m) => m.filter((x) => x._id !== deletedMsg._id));
    } else {
      setUnreadMessages((u) => u.filter((x) => x._id !== deletedMsg._id));
    }
    updateChatLastMessage(deletedMsg.chat, deletedMsg);
  };

  const onNewChat = (chat) => setChats((prev) => [chat, ...prev]);

  // Load chats and saved current chat on mount
  useEffect(() => {
    getChats();

    const saved = LocalStorage.get("currentChat");
    if (saved?._id) {
      setCurrentChat(saved);
    }
  }, []);

  // When socket and currentChat are ready, join the chat and load messages
  useEffect(() => {
    if (socket && currentChat?._id) {
      socket.emit(SOCKET_EVENTS.JOIN, currentChat._id);
      getMessages(currentChat._id);
    }
  }, [socket, currentChat]);

  // Socket event handlers - attach once to avoid duplicates!
  useEffect(() => {
    if (!socket) return;

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    socket.on(SOCKET_EVENTS.TYPING, () => setIsTyping(true));
    socket.on(SOCKET_EVENTS.STOP_TYPING, () => setIsTyping(false));
    socket.on(SOCKET_EVENTS.MESSAGE_RECEIVED, onMessageReceive);
    socket.on(SOCKET_EVENTS.NEW_CHAT, onNewChat);
    socket.on(SOCKET_EVENTS.LEAVE, onChatLeave);
    socket.on(SOCKET_EVENTS.UPDATE_GROUP_NAME, onGroupNameChange);
    socket.on(SOCKET_EVENTS.MESSAGE_DELETE, onMessageDelete);

    // Cleanup to prevent multiple listeners on re-render
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off(SOCKET_EVENTS.TYPING);
      socket.off(SOCKET_EVENTS.STOP_TYPING);
      socket.off(SOCKET_EVENTS.MESSAGE_RECEIVED);
      socket.off(SOCKET_EVENTS.NEW_CHAT);
      socket.off(SOCKET_EVENTS.LEAVE);
      socket.off(SOCKET_EVENTS.UPDATE_GROUP_NAME);
      socket.off(SOCKET_EVENTS.MESSAGE_DELETE);
    };
  }, [socket]);

  return (
    <>
      <AddChatModal
        open={openAddChat}
        onClose={() => setOpenAddChat(false)}
        onSuccess={getChats}
      />

      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-1/3 border-r p-4 overflow-y-auto">
          <div className="sticky top-0 flex items-center gap-2 bg-dark p-2 z-10">
            <button onClick={() => dispatch(logout())} className="btn">
              Log Out
            </button>
            <Input
              placeholder="Search..."
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value.toLowerCase())}
            />
            <button onClick={() => setOpenAddChat(true)} className="btn">
              + Add chat
            </button>
          </div>

          {loadingChats ? (
            <Typing />
          ) : (
            chats
              .filter((chat) =>
                !localSearchQuery ||
                getChatObjectMetadata(chat, user)
                  .title.toLowerCase()
                  .includes(localSearchQuery)
              )
              .map((chat) => (
                <ChatItem
                  key={chat._id}
                  chat={chat}
                  isActive={chat._id === currentChat?._id}
                  unreadCount={
                    unreadMessages.filter((m) => m.chat === chat._id).length
                  }
                  onClick={(c) => {
                    if (c._id === currentChat?._id) return;
                    setCurrentChat(c);
                    LocalStorage.set("currentChat", c);
                    setMessage("");
                    setMessages([]); // clear old messages when switching chats
                    getMessages(c._id);
                  }}
                  onChatDelete={(id) => {
                    setChats((prev) => prev.filter((c) => c._id !== id));
                    if (currentChat?._id === id) {
                      setCurrentChat(null);
                      LocalStorage.remove("currentChat");
                      setMessages([]);
                    }
                  }}
                />
              ))
          )}
        </div>

        {/* Message Pane */}
        <div className="w-2/3 flex flex-col">
          {currentChat?._id ? (
            <>
              <div className="flex items-center gap-2 border-b p-2 bg-dark sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <img
                    src={getChatObjectMetadata(currentChat, user).avatar}
                    className="h-14 w-14 rounded-full"
                    alt="avatar"
                  />
                  <div>
                    <p className="font-bold">
                      {getChatObjectMetadata(currentChat, user).title}
                    </p>
                    <small className="text-zinc-400">
                      {getChatObjectMetadata(currentChat, user).description}
                    </small>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto flex flex-col-reverse gap-4 p-4">
                {loadingMessages ? (
                  <Typing />
                ) : (
                  <>
                    {isTyping && <Typing />}
                    {messages.map((msg) => (
                      <MessageItem
                        key={msg._id}
                        message={msg}
                        isOwnMessage={msg.sender?._id.toString() === user._id.toString()}
                        isGroupChatMessage={currentChat.isGroupChat}
                        deleteChatMessage={deleteChatMessage}
                      />
                    ))}
                  </>
                )}
              </div>

              {/* Attachments Preview */}
              {attachedFiles.length > 0 && (
                <div className="p-4 grid grid-cols-5 gap-3">
                  {attachedFiles.map((file, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        className="h-32 w-32 object-cover rounded"
                        alt="attachment"
                      />
                      <button
                        onClick={() =>
                          setAttachedFiles((files) =>
                            files.filter((_, i) => i !== idx)
                          )
                        }
                        className="absolute top-1 right-1"
                      >
                        <XCircleIcon className="h-6 w-6 text-black" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Message Input */}
              <div className="p-3 flex items-center gap-2 border-t bg-dark sticky bottom-0">
                <label>
                  <PaperClipIcon className="h-6 w-6" />
                  <input
                    type="file"
                    multiple
                    hidden
                    onChange={(e) =>
                      e.target.files && setAttachedFiles(Array.from(e.target.files))
                    }
                  />
                </label>
                <Input
                  placeholder="Message..."
                  value={message}
                  onChange={handleTyping}
                  onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!message && attachedFiles.length === 0}
                >
                  <PaperAirplaneIcon className="h-6 w-6" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-grow flex items-center justify-center">
              No chat selected
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ChatPage;
