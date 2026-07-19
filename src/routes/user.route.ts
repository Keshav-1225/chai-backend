import { Router } from "express";
import { changeCurrentPassword, getCurrenctUser, getUserChannelProfile, getUserWatchHistory, loginUser, logoutUser, refreshAccessToken, registerUser, updateAccountDetails, updateAvatar, updateCoverImage } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()
router.route('/register').post(
    upload.any(),
    registerUser
)
router.route('/login').post(
    loginUser
)

// secured routes
router.route('/logout').post(verifyJWT, logoutUser)
router.route('/refresh-token').post(refreshAccessToken)
router.route('change-password').post(verifyJWT, changeCurrentPassword)

router.route('current-user').get(verifyJWT, getCurrenctUser)
router.route('/channel/:username').get(verifyJWT, getUserChannelProfile)
router.route('/watch-history').get(verifyJWT, getUserWatchHistory)

router.route('/update-account').patch(verifyJWT, updateAccountDetails)
router.route('/avatar').patch(verifyJWT, upload.single("avatar"), updateAvatar)
router.route('/cover-image').patch(verifyJWT, upload.single("coverImage"), updateCoverImage)


export default router