import mongoose from 'mongoose'

const playlistSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },
        description: {
            type: String,
            default: "Thanks for supporting"
        },
        videos: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Videos"
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    },
    { timestamps: true }
)

const Playlist = mongoose.model('Playlist', playlistSchema)
export default Playlist