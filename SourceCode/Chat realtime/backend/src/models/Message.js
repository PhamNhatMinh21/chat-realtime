//models/Message.js
import mongoose from "mongoose"

const reactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    emoji: { type: String, required: true }
}, { _id: false });

const messageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
        required: true,
        index: true
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    content: {
        type: String,
        trim: true
    },
    // fileUrl dùng cho tất cả loại file: ảnh, pdf, docx, v.v.
    fileUrl: { type: String },
    fileName: { type: String },
    fileType: { type: String },
    fileSize: { type: Number },
    type: { type: String, enum: ["text", "system_task", "system"], default: "text" },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", default: null },
    isRecalled: { type: Boolean, default: false },
    isEdited: { type: Boolean, default: false },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
    reactions: { type: [reactionSchema], default: [] },
    isToxic: { type: Boolean, default: false },
}, {
    timestamps: true
});

messageSchema.index({ conversationId: 1, createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);
export default Message;