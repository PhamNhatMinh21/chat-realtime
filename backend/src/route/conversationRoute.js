import express from 'express';
import multer from 'multer';
import path from 'path';
import { createConversation, getConversations, getMessages, updateGroup, uploadGroupAvatar, markSeen, leaveConversation, deleteConversation } from '../controllers/conversationController.js';

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'group-' + unique + path.extname(file.originalname));
    }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.post("/", createConversation);
router.get("/", getConversations);
router.get("/:conversationId/messages", getMessages);
router.put("/:conversationId", updateGroup);
router.post("/:conversationId/avatar", upload.single("avatar"), uploadGroupAvatar);
router.patch("/:conversationId/seen", markSeen);
router.delete("/:conversationId/leave", leaveConversation);
router.delete("/:conversationId", deleteConversation);

export default router;