import mongoose from 'mongoose'

const tweetsSchema = new mongoose.Schema(
    {
        owner:{
            type : mongoose.Schema.Types.ObjectId,
            ref :  "User"
        },
        content : {
            type: String,
            required: true
        }
    },
    {timestamps: true}
)

const Tweet = mongoose.model('Tweet',tweetsSchema)
export default Tweet    