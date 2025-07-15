import {Router} from "express"
import {
    getAllMessages,
    sendMessage,
    deleteMessage 
} from "../controller/message.controller.js"
import { verifyJwt } from "../middlewares/auth.middlewars.js";
import { upload } from "../middlewares/multer.middleware.js";
import { messagelimiter } from "../middlewares/ratelimit.middleware.js";

const router = Router()

router.use(verifyJwt)
router.route("/:chatId").get(getAllMessages)


router.route("/:chatId")
                    .post( messagelimiter,
                        upload.fields(
                        [
                            {name:"attachments" ,maxCount:10}
                        ])
                        , sendMessage)

router.route("/:chatId/:messageId").delete(deleteMessage)
export default router