import User from "../models/User.js";
import path from "path";
import fs from "fs";

export const authMe = async (req, res) => {
    try {
        return res.status(200).json(req.user);
    } catch (error) {
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

export const searchUserByUsername = async (req, res) => {
    try {
        const { username } = req.query;
        if (!username) return res.status(400).json({ message: "Thiếu thông tin tìm kiếm" });
        const searchVal = username.trim().toLowerCase();
        const user = await User.findOne({
            $or: [
                { username: searchVal },
                { email: searchVal }
            ]
        }).select('_id username displayName email avatarUrl');

        if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng này" });
        if (user._id.toString() === req.user._id.toString())
            return res.status(400).json({ message: "Đây là tài khoản của chính bạn!" });
        return res.status(200).json(user);
    } catch (error) {
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const { displayName, bio, username, phone, hometown, gender, dateOfBirth, hideActiveStatus } = req.body;
        const updateData = {};
        if (displayName !== undefined) updateData.displayName = displayName;
        if (bio !== undefined) updateData.bio = bio;
        if (phone !== undefined) updateData.phone = phone;
        if (hometown !== undefined) updateData.hometown = hometown;
        if (gender !== undefined) updateData.gender = gender;
        if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
        if (hideActiveStatus !== undefined) updateData.hideActiveStatus = hideActiveStatus;
        if (username !== undefined) {
            const trimmedUsername = username.trim().toLowerCase();
            if (trimmedUsername.length < 3) return res.status(400).json({ message: "Username phải từ 3 ký tự trở lên" });
            const existing = await User.findOne({ username: trimmedUsername });
            if (existing && existing._id.toString() !== userId.toString()) {
                return res.status(400).json({ message: "Username đã được người khác sử dụng" });
            }
            updateData.username = trimmedUsername;
        }

        const user = await User.findByIdAndUpdate(userId, updateData, { new: true })
            .select("-hashPassword");
        return res.status(200).json(user);
    } catch (error) {
        console.error("Lỗi cập nhật profile", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

export const uploadAvatar = async (req, res) => {
    try {
        const userId = req.user._id;
        const file = req.file;
        if (!file) return res.status(400).json({ message: "Không có file ảnh" });

        // Tự động xóa ảnh đại diện cũ khỏi máy chủ để tiết kiệm dung lượng ổ đĩa
        const oldAvatar = req.user.avatarUrl;
        if (oldAvatar && oldAvatar.startsWith("/uploads/")) {
            const oldPath = path.join(process.cwd(), oldAvatar);
            if (fs.existsSync(oldPath)) {
                fs.unlink(oldPath, (err) => {
                    if (err) console.error("Lỗi khi xóa ảnh đại diện cũ khỏi máy chủ:", err);
                    else console.log(` Đã xóa tệp ảnh đại diện cũ: ${oldAvatar}`);
                });
            }
        }

        const avatarUrl = `/uploads/${file.filename}`;
        const user = await User.findByIdAndUpdate(userId, { avatarUrl }, { new: true })
            .select("-hashPassword");

        return res.status(200).json(user);
    } catch (error) {
        console.error("Lỗi upload avatar", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};