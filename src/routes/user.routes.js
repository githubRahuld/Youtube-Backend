import { Router } from "express";
import {
  createNewPassword,
  getCurrentUser,
  getUserChannelProfile,
  getWatchHistory,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateAvatar,
  updateCoverImage,
  updateUserDetails,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    // upload images
    // used middlware
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser);

//secure routes             //middleware
router.route("/logout").post(verifyJWT, logoutUser);

router.route("/refresh-token").post(refreshAccessToken);

router.route("/change-password").post(verifyJWT, createNewPassword);

router.route("/current-user").get(verifyJWT, getCurrentUser);

// patch: used tp update espacific data
router.route("/update-account").patch(verifyJWT, updateUserDetails);

// upload avatar using multer(upload) which is single picture
router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateAvatar);

router
  .route("/cover-image")
  .patch(verifyJWT, upload.single("coverImage"), updateCoverImage);

router.route("/c/:username").get(verifyJWT, getUserChannelProfile); // username get from params

router.route("/history").get(verifyJWT, getWatchHistory);

export default router;
