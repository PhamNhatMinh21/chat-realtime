import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
        required: true,
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    deadline: {
        type: Date,
        required: true
    },
    assignees: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    status: {
        type: String,
        enum: ["pending", "done", "overdue"],
        default: "pending"
    },
    notifiedAt: {
        type: Date,
        default: null
    },
    notifiedStages: {
        type: [String],
        default: []
    }
}, { timestamps: true });

taskSchema.index({ deadline: 1, status: 1 });

const Task = mongoose.model("Task", taskSchema);
export default Task;
