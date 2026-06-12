import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["like", "love", "haha", "wow", "sad", "angry"], required: true }
}, { _id: false });

const commentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, trim: true },
}, {
    timestamps: true
});

const postSchema = new mongoose.Schema({
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    content: {
        type: String,
        trim: true
    },
    imageUrl: {
        type: String
    },
    reactions: {
        type: [reactionSchema],
        default: []
    },
    comments: {
        type: [commentSchema],
        default: []
    }
}, {
    timestamps: true
});

postSchema.index({ createdAt: -1 });

const Post = mongoose.model("Post", postSchema);
export default Post;
