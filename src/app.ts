import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import { NextFunction, Request, Response } from "express"
import { ApiError } from "./utils/ApiErrors.js"

const app = express()
app.use(cors(
    {
        origin: process.env.CORS_ORIGIN,
        credentials: true
    }
))

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true, limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

//routes import
import userRouter from "./routes/user.route.js"

app.get("/",(req:Request,res:Response)=>{
    res.send("Server working")
})
//routes declaration
app.use("/api/v1/users", userRouter)

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    const statusCode = err instanceof ApiError ? err.statusCode : 500
    const message = err instanceof Error ? err.message : "Internal Server Error"
    const errors = err instanceof ApiError ? err.errors : []

    res.status(statusCode).json({
        success: false,
        message,
        errors
    })
})

export default app
