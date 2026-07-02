// require('dotenv').config()
import { error } from "node:console"
import connectDB from "./db/db.js"
import dotenv from "dotenv"
import express from "express"
dotenv.config()
const app = express()
connectDB().then(
    ()=>{
        app.listen(process.env.PORT || 3000,()=>{
            console.log(`http://localhost:${port}`)
        })
    }
).catch((error)=>{
    console.log("Error whilte connecting database code with app code\n",error);
})


