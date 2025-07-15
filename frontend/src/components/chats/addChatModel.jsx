import { Dialog, Switch, Transition } from "@headlessui/react";
import {
  UserGroupIcon,
  XCircleIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";
import { Fragment, useEffect, useState } from "react";
import {
  createGroupChat,
  createUserChat,
  getAvailableUsers,
} from "../../api/chatApi/chatapi.jsx";
import { classNames, requestHandler } from "../../utils/index.js";
import Button from "../Button";
import Input from "../Input";
import Select from "../Select";

const AddChatModal = ({ open, onClose, onSuccess }) => {
  const [users, setUsers] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [groupParticipants, setGroupParticipants] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [creatingChat, setCreatingChat] = useState(false);

  const getUsers = async () => {
    requestHandler(
      async () => await getAvailableUsers(),
      null,
      (res) => {
        const { data } = res;
        setUsers(data || []);
      },
      alert
    );
  };

  const createNewChat = async () => {
    if (!selectedUserId) return alert("Please select a user");

    await requestHandler(
      async () => await createUserChat(selectedUserId),
      setCreatingChat,
      (res) => {
        const { data } = res;
        console.log("response from backend:",data)

        // ✅ Always send the chat back to parent to show it in list
        onSuccess(data);

        if (res.statusCode === 200) {
          alert("Chat already exists. Opening it.");
        } else {
          alert("New chat created successfully.");
        }

        handleClose();
      },
      alert
    );
  };

  const createNewGroupChat = async () => {
    if (!groupName) return alert("Group name is required");
    if (!groupParticipants.length || groupParticipants.length < 2)
      return alert("There must be at least 2 group participants");

    await requestHandler(
      async () =>
        await createGroupChat({
          name: groupName,
          participants: groupParticipants,
        }),
      setCreatingChat,
      (res) => {
        const { data } = res;
        onSuccess(data);
        alert("Group chat created successfully.");
        handleClose();
      },
      alert
    );
  };

  const handleClose = () => {
    setUsers([]);
    setSelectedUserId("");
    setGroupName("");
    setGroupParticipants([]);
    setIsGroupChat(false);
    onClose();
  };

  useEffect(() => {
    if (open) getUsers();
  }, [open]);

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform rounded-lg bg-dark px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl sm:p-6">
                <div className="flex justify-between items-center">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-semibold leading-6 text-black"
                  >
                    Create chat
                  </Dialog.Title>
                  <button
                    type="button"
                    className="rounded-md text-zinc-400 hover:text-zinc-600"
                    onClick={handleClose}
                  >
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                {/* Toggle for group chat */}
                <div className="flex items-center my-5">
                  <Switch
                    checked={isGroupChat}
                    onChange={setIsGroupChat}
                    className={classNames(
                      isGroupChat ? "bg-secondary" : "bg-zinc-200",
                      "relative inline-flex h-6 w-11 rounded-full border-2 transition-colors duration-200 ease-in-out"
                    )}
                  >
                    <span
                      className={classNames(
                        isGroupChat
                          ? "translate-x-5 bg-success"
                          : "translate-x-0 bg-black",
                        "inline-block h-5 w-5 transform rounded-full transition duration-200"
                      )}
                    />
                  </Switch>
                  <span className="ml-3 text-sm font-medium text-black">
                    Is it a group chat?
                  </span>
                </div>

                {isGroupChat && (
                  <div className="my-5">
                    <Input
                      placeholder="Enter a group name..."
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                    />
                  </div>
                )}

                {/* Select users */}
                <div className="my-5">
                  <Select
                    placeholder={
                      isGroupChat
                        ? "Select group participants..."
                        : "Select a user to chat..."
                    }
                    value={isGroupChat ? "" : selectedUserId || ""}
                    options={users.map((user) => ({
                      label: user.username,
                      value: user._id,
                    }))}
                    onChange={({ value }) => {
                      if (isGroupChat) {
                        if (!groupParticipants.includes(value)) {
                          setGroupParticipants([...groupParticipants, value]);
                        }
                      } else {
                        setSelectedUserId(value);
                      }
                    }}
                  />
                </div>

                {/* Group participant badges */}
                {isGroupChat && (
                  <div className="my-5">
                    <span className="font-medium text-black inline-flex items-center">
                      <UserGroupIcon className="h-5 w-5 mr-2" />
                      Selected participants
                    </span>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {users
                        .filter((user) =>
                          groupParticipants.includes(user._id)
                        )
                        .map((participant) => (
                          <div
                            key={participant._id}
                            className="inline-flex bg-secondary rounded-full p-2 border border-zinc-400 items-center gap-2"
                          >
                            <img
                              className="h-6 w-6 rounded-full object-cover"
                              src={participant.avatar.url}
                            />
                            <p className="text-black">
                              {participant.username}
                            </p>
                            <XCircleIcon
                              role="button"
                              className="w-6 h-6 hover:text-primary cursor-pointer"
                              onClick={() =>
                                setGroupParticipants((prev) =>
                                  prev.filter((id) => id !== participant._id)
                                )
                              }
                            />
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Buttons */}
                <div className="mt-5 flex justify-between gap-4">
                  <Button
                    disabled={creatingChat}
                    severity="secondary"
                    onClick={handleClose}
                    className="w-1/2"
                  >
                    Close
                  </Button>
                  <Button
                    disabled={creatingChat}
                    onClick={
                      isGroupChat ? createNewGroupChat : createNewChat
                    }
                    className="w-1/2"
                  >
                    Create
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default AddChatModal;
