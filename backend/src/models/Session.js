import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',// lien ket voi user
        required: true,
        index: true,
    },
    refreshToken: {
        type: String,
        required: true,
        unique: true
    },
    expiredAt: {
        type: Date,
        required: true,
    }
}, {
    timestamps: true,
})

// tu dong xoa khi het han
sessionSchema.index({ expiredAt: 1 }, { expiredAfterSeconds: 0 });

export default mongoose.model('Session', sessionSchema);