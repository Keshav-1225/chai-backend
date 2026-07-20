import mongoose from 'mongoose'

const likeSchema = new mongoose.Schema(
    {
        comment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment"
        },
        video: {
            type: mongoose.Schema.Types.ObjectId,
            ref:"Videos"
        },
        likedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        
    },
    {timestamps: true}
)

const Like = mongoose.model('Like',likeSchema)
export default Like