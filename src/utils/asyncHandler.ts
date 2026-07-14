import { Request, Response, NextFunction, RequestHandler } from "express"

const asyncHandler = (requestHandler:RequestHandler) => {
    return (req:Request,res:Response,next:NextFunction)=>{
        Promise.resolve(requestHandler(req,res,next)).catch((err)=>{next(err)})
    }
}
export {asyncHandler}


/* You will find this in majority  */
// async function asyncHandler(fn:any) {   //Higher Order Functions: A function that either takes a function as an argument or returns a function
//     async (req:Request, res:Response, next:NextFunction)=>{
//         try {
//             fn(req,res,next)
//         } catch (error) {
//             res.status(err.code || 500).json({
//                 success:false,
//                 message:err.message
//             })
//         }
//     }
// }