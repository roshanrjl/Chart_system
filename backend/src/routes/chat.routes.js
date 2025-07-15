import {Router} from "express"
import{
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
} from "../controller/chat.controller.js"

import { verifyJwt } from "../middlewares/auth.middlewars.js";
import { upload } from "../middlewares/multer.middleware.js";
import { Loginlimiter } from "../middlewares/ratelimit.middleware.js";

const router = Router()

router.use(verifyJwt)

router.route("/").get(getAllChats)

router.route("/user").get(searchAvaiableUser)

router.route("/:receiverId").post(createOrGetAOneOnOneChat)

router.route("/group").post(creteGroupChart)
router.route("/group/:chatId").get(getGroupChatDetails)
                              .post(renameGroupChat)
                              .delete(deleteGroupChat)
router.route("/group/:chatId/:participantId")
                               .post(addNewParticipantInGroupChat)
                              .delete(removeParticipantFromGroupChat)

router.route("/leave/group/:chatId").delete(leaveGroupChat)

router.route("/remove/:chatid").delete(deleteOneOnOneChat)

export default router 