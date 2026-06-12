import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    hashPassword: {
        type: String,
        required: false   // lựa chọn: Google OAuth users không có password
    },
    googleId: {
        type: String,
        sparse: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    displayName: {
        type: String,
        required: true,
        trim: true
    },
    avatarUrl: { type: String },
    avatarId: { type: String },
    bio: { type: String, maxlength: 500 },
    phone: {
        type: String,
        sparse: true
    },
    hometown: { type: String },
    gender: { type: String },
    dateOfBirth: { type: String },
    hideActiveStatus: { type: Boolean, default: false },
    lastActive: { type: Date, default: Date.now }
}, {
    timestamps: true
});

const User = mongoose.model("User", userSchema);
export default User;