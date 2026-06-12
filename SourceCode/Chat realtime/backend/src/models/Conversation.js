//models/Conversation.js
import mongoose from "mongoose";

const participantSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    joinedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    _id: false,
}) // ko tao id rieng cho tung phan ty

const groupSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
    },
    avatarUrl: {
        type: String,
        default: null
    },
    createBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
}, {
    _id: false,
})


const lastMessageSchema = new mongoose.Schema({
    _id: { type: String },
    content: {
        type: String,
        default: null
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    isRecalled: {
        type: Boolean,
        default: false
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    isToxic: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: null,
    }
}, {
    _id: false,
})
const conversationSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ["direct", "group"],
        required: true
    },
    participants: {
        type: [participantSchema],
        required: true
    },
    group: {
        type: groupSchema,
    },

    lastMessageAt: {
        type: Date
    },
    seenBy: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ],
    lastMessage: {
        type: lastMessageSchema,
        default: null
    },
    // unreadCounts lưu số tin chưa đọc theo userId dạng Map.
    unreadCounts: {
        type: Map,
        of: Number,
        default: {},
    },
}, {
    timestamps: true,
})

//truy van danh sach chat nhanh hon
conversationSchema.index({
    "participants.userId": 1,
    lastMessageAt: -1,
});

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;