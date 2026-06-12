import Post from "../models/Post.js";
import Friend from "../models/Friend.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixFileName = (name) => {
    try {
        return Buffer.from(name, 'latin1').toString('utf8');
    } catch {
        return name;
    }
};

export const createPost = async (req, res) => {
    try {
        const { content } = req.body;
        const file = req.file;

        if (!content && !file) {
            return res.status(400).json({ message: "Bài viết phải có nội dung chữ hoặc hình ảnh" });
        }

        const postData = {
            authorId: req.user._id,
            content: content || "",
        };

        if (file) {
            postData.imageUrl = `/uploads/${file.filename}`;
        }

        const post = await Post.create(postData);

        const populatedPost = await Post.findById(post._id)
            .populate("authorId", "displayName avatarUrl username")
            .populate("comments.userId", "displayName avatarUrl username");

        return res.status(201).json({ message: "Đăng bài thành công", data: populatedPost });
    } catch (error) {
        console.error("Lỗi khi tạo bài viết:", error);
        return res.status(500).json({ message: "Lỗi hệ thống khi tạo bài viết" });
    }
};

export const getFeed = async (req, res) => {
    try {
        const userId = req.user._id;

        // Tìm tất cả bạn bè của user hiện tại
        const friendships = await Friend.find({
            $or: [{ userA: userId }, { userB: userId }]
        });

        const friendIds = friendships.map(f =>
            f.userA.toString() === userId.toString() ? f.userB : f.userA
        );

        // Lấy tất cả bài đăng của bạn bè và của chính bản thân
        const authorIds = [userId, ...friendIds];

        const posts = await Post.find({ authorId: { $in: authorIds } })
            .sort({ createdAt: -1 })
            .populate("authorId", "displayName avatarUrl username")
            .populate("comments.userId", "displayName avatarUrl username");

        return res.status(200).json({ data: posts });
    } catch (error) {
        console.error("Lỗi khi lấy bảng tin:", error);
        return res.status(500).json({ message: "Lỗi hệ thống khi lấy bảng tin" });
    }
};

export const reactToPost = async (req, res) => {
    try {
        const { id } = req.params;
        const { type } = req.body; // like, love, haha, wow, sad, angry
        const userId = req.user._id;

        const allowedReactions = ["like", "love", "haha", "wow", "sad", "angry"];
        if (!allowedReactions.includes(type)) {
            return res.status(400).json({ message: "Loại tương tác không hợp lệ" });
        }

        const post = await Post.findById(id);
        if (!post) {
            return res.status(404).json({ message: "Không tìm thấy bài viết" });
        }

        const existingReactionIndex = post.reactions.findIndex(
            r => r.userId.toString() === userId.toString()
        );

        if (existingReactionIndex > -1) {
            const existingReaction = post.reactions[existingReactionIndex];
            if (existingReaction.type === type) {
                // Click cùng loại: xóa reaction
                post.reactions.splice(existingReactionIndex, 1);
            } else {
                // Click loại khác: cập nhật loại
                post.reactions[existingReactionIndex].type = type;
            }
        } else {
            // Chưa react bao giờ: thêm mới
            post.reactions.push({ userId, type });
        }

        await post.save();

        const updatedPost = await Post.findById(id)
            .populate("authorId", "displayName avatarUrl username")
            .populate("comments.userId", "displayName avatarUrl username");

        return res.status(200).json({ data: updatedPost.reactions, post: updatedPost });
    } catch (error) {
        console.error("Lỗi khi tương tác bài viết:", error);
        return res.status(500).json({ message: "Lỗi hệ thống khi tương tác bài viết" });
    }
};

export const commentOnPost = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const userId = req.user._id;

        if (!content || !content.trim()) {
            return res.status(400).json({ message: "Nội dung bình luận không được để trống" });
        }

        const post = await Post.findById(id);
        if (!post) {
            return res.status(404).json({ message: "Không tìm thấy bài viết" });
        }

        post.comments.push({ userId, content: content.trim() });
        await post.save();

        const updatedPost = await Post.findById(id)
            .populate("authorId", "displayName avatarUrl username")
            .populate("comments.userId", "displayName avatarUrl username");

        return res.status(201).json({ data: updatedPost.comments, post: updatedPost });
    } catch (error) {
        console.error("Lỗi khi bình luận bài viết:", error);
        return res.status(500).json({ message: "Lỗi hệ thống khi bình luận bài viết" });
    }
};

export const deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const post = await Post.findById(id);
        if (!post) {
            return res.status(404).json({ message: "Không tìm thấy bài viết" });
        }

        // Kiểm tra quyền: chỉ chủ bài viết mới được xóa
        if (post.authorId.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Bạn không có quyền xóa bài viết này" });
        }

        // Nếu có ảnh, tiến hành xóa file ảnh ở local folder
        if (post.imageUrl && post.imageUrl.startsWith("/uploads/")) {
            const fileName = post.imageUrl.replace("/uploads/", "");
            const filePath = path.join(__dirname, "../../uploads", fileName);
            fs.unlink(filePath, (err) => {
                if (err) console.error("Không thể xóa file ảnh cũ:", err);
                else console.log("Đã xóa file ảnh bài đăng:", fileName);
            });
        }

        await Post.findByIdAndDelete(id);
        return res.status(200).json({ message: "Xóa bài viết thành công" });
    } catch (error) {
        console.error("Lỗi khi xóa bài viết:", error);
        return res.status(500).json({ message: "Lỗi hệ thống khi xóa bài viết" });
    }
};

export const deleteComment = async (req, res) => {
    try {
        const { id, commentId } = req.params;
        const userId = req.user._id;

        const post = await Post.findById(id);
        if (!post) {
            return res.status(404).json({ message: "Không tìm thấy bài viết" });
        }

        const comment = post.comments.id(commentId);
        if (!comment) {
            return res.status(404).json({ message: "Không tìm thấy bình luận" });
        }

        // Quyền xóa: chủ bài viết hoặc chủ bình luận
        const isPostAuthor = post.authorId.toString() === userId.toString();
        const isCommentAuthor = comment.userId.toString() === userId.toString();

        if (!isPostAuthor && !isCommentAuthor) {
            return res.status(403).json({ message: "Bạn không có quyền xóa bình luận này" });
        }

        // Xóa comment
        post.comments.pull(commentId);
        await post.save();

        const updatedPost = await Post.findById(id)
            .populate("authorId", "displayName avatarUrl username")
            .populate("comments.userId", "displayName avatarUrl username");

        return res.status(200).json({ message: "Xóa bình luận thành công", data: updatedPost.comments, post: updatedPost });
    } catch (error) {
        console.error("Lỗi khi xóa bình luận:", error);
        return res.status(500).json({ message: "Lỗi hệ thống khi xóa bình luận" });
    }
};
