// Utility function to handle API requests with loading and error handling
const requestHandler = async (api, setLoading, onSuccess, onError) => {
  setLoading && setLoading(true);
  try {
    const response = await api();
    const { data } = response;
    // console.log(data)
    

    if (data?.success) {
      onSuccess(data);
    }
  } catch (error) {
    if ([401, 403].includes(error?.response?.data?.statusCode)) {
      localStorage.clear();
      if (typeof window !== "undefined") window.location.href = "/login";
    }
    onError(error?.response?.data?.message || "Something went wrong");
  } finally {
    setLoading && setLoading(false);
  }
};

// Helper to extract chat metadata like title, avatar, and last message
const getChatObjectMetadata = (chat, loggedInUser = {}) => {
  let lastMessage;


  if (chat.lastMessage?.content) {
    lastMessage = chat.lastMessage.content;
  } else if (chat.lastMessage?.attachments?.length) {
    const count = chat.lastMessage.attachments.length;
    lastMessage = `${count} attachment${count > 1 ? "s" : ""}`;
  } else {
    lastMessage = "No message yet";
  }

  const participaints = Array.isArray(chat.participaints) ? chat.participaints : [];

  if (chat.isGroupChat) {
    return {
      avatar: chat.profileImage || null,
      title: chat.name || "Unnamed Group",
      description: `${participaints.length} members in the chat`,
      lastMessage: chat.lastMessage
        ? `${chat.lastMessage.sender?.username || "Unknown"}: ${lastMessage}`
        : lastMessage,
    };
  } else
     {
    if (!loggedInUser) {
      return {
        avatar: null,
        title: "Unknown",
        description: "",
        lastMessage,
      };
    }

    const receiver = participaints.find(
      (p) => String(p._id) !== String(loggedInUser)
    );

   

    return {
      avatar: receiver?.profileImage || null,
      title: receiver?.username || "Unknown",
      description: receiver?.email || "",
      lastMessage,
    };
  }
};

// A utility function to concatenate class names with spacing
const classNames = (...className) => {
  return className.filter(Boolean).join(" ");
};

// Utility: Check if we are in the browser
const isBrowser = typeof window !== "undefined";

// Class to interact with localStorage safely
class LocalStorage {
  static get(key) {
    if (!isBrowser) return null;
    const value = localStorage.getItem(key);
    try {
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  static set(key, value) {
    if (!isBrowser) return;
    localStorage.setItem(key, JSON.stringify(value));
  }

  static remove(key) {
    if (!isBrowser) return;
    localStorage.removeItem(key);
  }

  static clear() {
    if (!isBrowser) return;
    localStorage.clear();
  }
}

// Export all functions and classes
export {
  requestHandler,
  getChatObjectMetadata,
  classNames,
  isBrowser,
  LocalStorage,
};
