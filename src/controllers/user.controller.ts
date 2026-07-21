import { asyncHandler } from "../utils/asyncHandler.js";
import { Request, response, Response } from "express";
import ApiResponse from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiErrors.js";
import User from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";
import { TokenPayload } from "../utils/typedef.js";

const options = {
    httpOnly: true,
    secure: true
}

const generateAccessAndRefreshToken = async (userID: any) => {
    try {
        const user = await User.findById(userID)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh tokens")
    }
}
const normalizeUploadFieldName = (fieldName: string) => fieldName.toLowerCase().replace(/[^a-z]/g, "");

const avatarFieldNames = new Set([
    "avatar",
    "avatarimage",
    "profileimage",
    "profile",
    "image"
]);

const coverImageFieldNames = new Set([
    "coverimage",
    "cover",
    "coverphoto",
    "bannerimage",
    "coverimg",
    "banner",
    "thumbnail"
]);

const registerUser = asyncHandler(async (req: Request, res: Response) => {
    // Get user details
    // Validation - not empty
    // check if user already exists: username, email
    // check for images, avatar
    // upload them to cloudinary, check avatar
    // Create user object
    // creation call - create entry in db
    // remove password and refresh token from response to send to frontend
    // check for user creation
    // return response
    const { username, email, fullname, password } = req.body
    console.log(`username: ${username} \nEmail: ${email} \nfullname: ${fullname}`);

    // Validation
    if (
        [username, email, fullname, password].some((field) => typeof field !== "string" || field.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required!")
    }

    // Check User existance
    const IsUserAlreadyThere = await User.findOne({
        $or: [{ email }, { username }]
    })
    if (IsUserAlreadyThere) throw new ApiError(409, "User already exist")

    // Multer check
    const uploadedFiles = req.files as
        | Express.Multer.File[]
        | { [fieldname: string]: Express.Multer.File[] }
        | undefined;

    const normalizedFiles = Array.isArray(uploadedFiles)
        ? uploadedFiles
        : Object.values(uploadedFiles ?? {}).flat();

    const avatarLocalPath = normalizedFiles.find((file) =>
        avatarFieldNames.has(normalizeUploadFieldName(file.fieldname))
    )?.path || (typeof req.body.avatar === "string" && req.body.avatar.trim() ? req.body.avatar : undefined);

    const coverImageLocalPath = normalizedFiles.find((file) =>
        coverImageFieldNames.has(normalizeUploadFieldName(file.fieldname))
    )?.path
        || (typeof req.body.coverImage === "string" && req.body.coverImage.trim()
            ? req.body.coverImage
            : undefined);

    const normalizedAvatarPath = avatarLocalPath ? avatarLocalPath.replace(/\\/g, "/") : undefined;
    const normalizedCoverImagePath = coverImageLocalPath ? coverImageLocalPath.replace(/\\/g, "/") : undefined;

    if (!normalizedAvatarPath) throw new ApiError(400, "Avatar is required")

    let avatarUpload;
    let coverImageUpload = null;

    try {
        avatarUpload = await uploadOnCloudinary(normalizedAvatarPath)
        coverImageUpload = normalizedCoverImagePath ? await uploadOnCloudinary(normalizedCoverImagePath) : null
    } catch (error) {
        throw new ApiError(502, `Cloudinary upload failed: ${(error as Error).message}`)
    }

    const avatarUrl = avatarUpload?.url
    const coverImageUrl = coverImageUpload?.url || ""

    if (!avatarUrl) throw new ApiError(502, "Cloudinary did not return an avatar URL")

    // User object
    const user = await User.create({
        username,
        email,
        fullname,
        avatar: avatarUrl,
        coverImage: coverImageUrl,
        password
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")
    if (!createdUser) throw new ApiError(500, "Error while creating the user")

    return res.status(201).json(new ApiResponse(200, createdUser, "User registered Successfully"))
})

const loginUser = asyncHandler(async (req: Request, res: Response) => {
    // get data from user
    const { email, username, password } = await req.body
    // check from user
    if (!(username || email)) throw new ApiError(400, "Email or username is required")
    // find the user
    let user = await User.findOne({ $or: [{ email }, { username }] })
    if (!user) throw new ApiError(404, "User does not exist")

    // password check
    const validatePassword = await user.isPasswordCorrect(password)
    if (!validatePassword) throw new ApiError(400, "Password is incorrect")

    // create access and refresh token
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    // send cookie
    user = await User.findById(user._id).select("-password -refreshToken")

    return res.status(200)
        .cookie("accessToken", accessToken)
        .cookie("refreshToken", refreshToken)
        .json(new ApiResponse(200, {
            user: user, accessToken, refreshToken
        }, "User logged In Successfully"))

    // send response
})

const logoutUser = asyncHandler(async (req: Request, res: Response) => {
    await User.findOneAndUpdate(
        req.user?._id,
        {
            $set: { refreshToken: undefined }
        },
        { new: true }
    )

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken = asyncHandler(async (req: Request, res: Response) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized request")

    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET!) as TokenPayload
    const user = await User.findById(decodedToken?._id)
    if (!user) throw new ApiError(401, "Invalid refresh token")

    if (incomingRefreshToken !== user?.refreshToken) throw new ApiError(401, "Refresh token is expired or used")
    try {

        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)
        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(new ApiResponse(200, {
                accessToken,
                refreshToken
            }, "Access token refreshed successfully"))
    } catch (error: any) {
        throw new ApiError(401, error.message)
    }
})

const changeCurrentPassword = asyncHandler(async (req: Request, res: Response) => {
    const { oldPassword, newPassword } = req.body
    const user = await User.findById(req.user?._id!)
    const isPasswordCorrect = user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) throw new ApiError(400, "Old password is incorrect")

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            {},
            "Password changed successfully"
        ))
})

const getCurrenctUser = asyncHandler(async (req: Request, res: Response) => {
    return res
        .status(200)
        .json(new ApiResponse(
            200,
            req.user,
            "Current user fetched successfully"
        ))
})

const updateAccountDetails = asyncHandler(async (req: Request, res: Response) => {
    const { username, fullname } = req.body
    if (!fullname && !username) throw new ApiError(400, "Username and fullname is required")

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                username
            }
        },
        { new: true }
    ).select("-password")
    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated"))
})

const updateAvatar = asyncHandler(async (req: Request, res: Response) => {
    const avatarLocalPath = req.file?.path
    if (!avatarLocalPath) throw new ApiError(400, "Avatar file missing")

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if (!avatar.url) throw new ApiError(400, "Avatar not getting uploaded on cloudinary")

    const userAvatar = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password")
    return res.status(200)
    .json(new ApiResponse(200, userAvatar, "Avatar Updated successfully"))
})

const updateCoverImage = asyncHandler(async (req: Request, res: Response) => {
    const coverImageLocalPath = req.file?.path
    // console.log(coverImageLocalPath);
    if (!coverImageLocalPath) throw new ApiError(400, "Cover Image missing")

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if (!coverImage.url) throw new ApiError(400, "Cover Image not getting uploaded on cloudinary")

    const userCoverImage = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select("-password")
    return res.status(200)
        .json(new ApiResponse(200, userCoverImage, "Cover Image Uploaded successfully"))
})

const getUserChannelProfile = asyncHandler(async (req: Request, res: Response) => {
    const username = req.params.username as string
    if (!username?.trim()) throw new ApiError(400, "username is missing")

    const channel = await User.aggregate([
        {   //Stage - 1 : works same as find, match is used in aggregations. Taking document whose channel page is requested
            $match: {
                username: username?.toLowerCase()
            }
        },
        {   //Stage - 2 : lookup works as JOIN in mongo. we are joining  User with Subscription model. Fetching array of subscribers who has subscribed to the channel
            $lookup: {
                from: 'subsriptions',
                localField: '_id',
                foreignField: 'channel',
                as: 'subscribers'
            }
        },
        {   //Stage - 3 : Fetching to whom user has subscribed
            $lookup: {
                from: 'subsriptions',
                localField: '_id',
                foreignField: 'subscriber',
                as: 'subscribedTo'
            }
        },
        {   //Stage - 4 : Adding custom fields
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {   //Stage - 5 : Send only those fields that are required instead of whole data
            $project: {
                fullname: 1,
                username: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1
            }
        }
    ])

    if (!channel?.length) throw new ApiError(404, "Channel does not exist")

    return res.status(200)
        .json(new ApiResponse(200, channel[0], "User channel fetched successfully"))
})

const getUserWatchHistory = asyncHandler(async (req: Request, res: Response) => {
    const user = await User.aggregate([
        {   //Stage - 1: Find
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {   //Stage - 2
            $lookup: {
                from: 'videos',
                localField: 'watchHistory',
                foreignField: '_id',
                as: 'watchHistory',
                pipeline: [
                    {   //Sub stage - 1 : lookup : users
                        $lookup: {
                            from: 'users',
                            localField: 'owner',
                            foreignField: '_id',
                            as: 'owner',
                            pipeline: [
                                {   //Sub Sub stage - 1 : Project pipeline
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }

                                }
                            ]
                        }
                    },
                    {   //Sub stage - 2 : Helps to pass on the object instead of an array that has the object
                        $addFields:{
                            owner : { $first : "$owner" }
                        }
                    }
                ]
            }
        }
    ])
    return res.status(200)
    .json(new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch history fetched successfully"
    ))
})
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrenctUser,
    updateAccountDetails,
    updateAvatar,
    updateCoverImage,
    getUserChannelProfile,
    getUserWatchHistory
}
