import { Router } from "express";
import {
  registerUser,
  login,
  logout,
  getCurrentUser,
  updateAccountDetails,
  changeCurrentPassword,
  changeProfileImage,
} from "../controller/user.controller.js";
import { verifyJwt } from "../middlewares/auth.middlewars.js";
import { upload } from "../middlewares/multer.middleware.js";
import { Loginlimiter } from "../middlewares/ratelimit.middleware.js";

const router = Router();


router.route("/register").post(upload.single("file"), registerUser);
router.route("/login").post(Loginlimiter, login);



router.route("/logout").post(verifyJwt, logout);
router.route("/getCurrentUser").get(verifyJwt, getCurrentUser);
router.route("/updateAccountDetails").patch(verifyJwt, updateAccountDetails);
router.route("/changeCurrentPassword").patch(verifyJwt, changeCurrentPassword);
router
  .route("/changeProfileImage")
  .patch(verifyJwt, upload.single("profileImage"), changeProfileImage);

export default router;
