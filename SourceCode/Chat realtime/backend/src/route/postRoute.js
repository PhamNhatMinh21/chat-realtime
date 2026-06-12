//route/postRoute.js
import express from "express";
import multer from "multer";
import path from "path";
import {
    createPost,
    getFeed,
    reactToPost,
    commentOnPost,
    deletePost,
    deleteComment
} from "../controllers/postController.js";

const router = express.Router();

// Cấu hình Multer để lưu trữ ảnh tải lên bài đăng
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        cb(null, "post-" + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // Giới hạn 5MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error("Chỉ cho phép tải lên file hình ảnh (jpeg, jpg, png, gif, webp)"));
        }
    }
});

// Định nghĩa các endpoints
router.get("/feed", getFeed);
router.post("/", upload.single("image"), createPost);
router.post("/:id/react", reactToPost);
router.post("/:id/comment", commentOnPost);
router.delete("/:id", deletePost);
router.delete("/:id/comments/:commentId", deleteComment);

export default router;
