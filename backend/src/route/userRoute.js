//route/userRoute.js
import express from "express";
import multer from "multer";
import path from "path";
import { authMe, searchUserByUsername, updateProfile, uploadAvatar } from "../controllers/userController.js";

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => {
        const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, "avatar-" + unique + path.extname(file.originalname));
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) cb(null, true);
        else cb(new Error("Chỉ hỗ trợ file ảnh"));
    }
});

router.get("/me", authMe);
router.put("/me", updateProfile);
router.post("/me/avatar", upload.single("avatar"), uploadAvatar);
router.get("/search", searchUserByUsername);

export default router;