import { connect } from "http2";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Request, Response } from "express";
import connectDB from "../db/db.js";
import ApiResponse from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiErrors.js";
import User from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const registerUser = asyncHandler(async (req:Request, res:Response) => {
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
    const {username, email, fullname, avatar, coverImage, password} = req.body
    console.log(`username: ${username} \nEmail: ${email} \nfullname: ${fullname}`);

    // Validation
    if(
        [username, email, fullname, avatar, coverImage, password].some((field)=>field?.trim() === "")   //It will check all the elements in an array and return true if any field is empty
    ){
        throw new ApiError(400,"All fields are required!")
    }

    // Check User existance
    const IsUserAlreadyThere = await User.findOne({
        $or:[{email},{username}]
    })
    if(IsUserAlreadyThere) throw new ApiError(409,"User already exist")

    // Multer check
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const avatarLocalPath = files?.avatar?.[0]?.path;
    const coverImageLocalPath = files?.coverImage?.[0]?.path;

    if(!avatarLocalPath) throw new ApiError(400,"Avatar is required")

    // Upload on cloudinary
    const Avatar = await uploadOnCloudinary(avatarLocalPath)
    const CoverImage = await uploadOnCloudinary(coverImage)

    if(!Avatar) throw new ApiError(400,"Avatar is Required")

    // User object
    const user = await User.create({
        username,
        email,
        fullname,
        avatar: Avatar.url,
        coverImage: CoverImage?.url || "",
        password
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")
    if(!createdUser) throw new ApiError(500,"Error while creating the user")

    return res.status(201).json(new ApiResponse(200, createdUser, "User registered Successfully"))
})

export {registerUser}