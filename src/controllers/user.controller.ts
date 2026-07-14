import { asyncHandler } from "../utils/asyncHandler.js";
import { Request, Response } from "express";

const registerUser = asyncHandler(async (req:Request, res:Response) => {
    res.status(200).json({message:"ok"})
})

export {registerUser}