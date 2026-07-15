import { asyncHandler } from "../utils/asyncHandler.js";
import { Request, Response } from "express";
import ApiResponse from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiErrors.js";
import User from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const generateAccessAndRefreshToken = async (userID:any) => {
    try {
        const user = await User.findById(userID)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false})

        return{accessToken, refreshToken}
        
    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating access and refresh tokens")
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
    const {username, email, fullname, password} = req.body
    console.log(`username: ${username} \nEmail: ${email} \nfullname: ${fullname}`);

    // Validation
    if(
        [username, email, fullname, password].some((field) => typeof field !== "string" || field.trim() === "")
    ){
        throw new ApiError(400,"All fields are required!")
    }

    // Check User existance
    const IsUserAlreadyThere = await User.findOne({
        $or:[{email},{username}]
    })
    if(IsUserAlreadyThere) throw new ApiError(409,"User already exist")

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

    if(!normalizedAvatarPath) throw new ApiError(400,"Avatar is required")

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

    if(!avatarUrl) throw new ApiError(502,"Cloudinary did not return an avatar URL")

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
    if(!createdUser) throw new ApiError(500,"Error while creating the user")

    return res.status(201).json(new ApiResponse(200, createdUser, "User registered Successfully"))
})

const loginUser = asyncHandler(async(req:Request, res:Response)=>{
    // get data from user
    const {email, username, password} = await req.body
    // check from user
    if(!username || !email) throw new ApiError(400,"Email or username is required")
    // find the user
    let user = await User.findOne({$or: [{email},{username}]})
    if(!user) throw new ApiError(404,"User does not exist")

    // password check
    const validatePassword = await user.isPasswordCorrect(password)
    if(!validatePassword) throw new ApiError(400,"Password is incorrect")

    // create access and refresh token
    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    // send cookie
    user = User.findById(user._id).select("-password -refreshToken")
     
    const options = {
        httpOnly: true,
        secure:true
    }

    return res.status(200)
    .cookie("accessToken",accessToken)
    .cookie("refreshToken",refreshToken)
    .json(new ApiResponse(200,{
        user:user, accessToken, refreshToken
    },"User logged In Successfully"))

    // send response
})

const logoutUser = asyncHandler( async (req:Request, res:Response) => {
    await User.findOneAndUpdate(
        req.user?._id,
        {
            $set: {refreshToken: undefined}
        }
        {new:true}
    )
    const options = {
        httpOnly: true,
        secure:true
    }
    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged Out"))
})

export {
    registerUser,
    loginUser,
    logoutUser
}
