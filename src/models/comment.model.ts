import mongoose from 'mongoose'

const commentSchema = new mongoose.Schema(
    {
        content:{
            type: String,
            req: true
        },
        video:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Videos"
        },
        owner:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User"
        }
    },
    {timestamps: true}
)

const Comment = mongoose.model('Comment',commentSchema)
export default Comment