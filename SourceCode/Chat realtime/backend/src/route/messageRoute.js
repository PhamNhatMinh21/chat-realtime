//route/messageRoute.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import {
    sendDirectMessage,
    sendGroupMessage,
    recallMessage,
    addReaction,
    editMessage
} from '../controllers/messageController.js';
import { checkFriendship, checkGroupMembership } from '../middlewares/friendMiddleware.js';

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // Giới hạn 10MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|mp4|mp3|pdf|doc|docx|txt/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Loại file không được hỗ trợ'));
        }
    }
});

router.post("/direct", checkFriendship, sendDirectMessage);
router.post("/group", checkGroupMembership, sendGroupMessage);

router.post("/direct/upload", upload.single('file'), checkFriendship, sendDirectMessage);
router.post("/group/upload", upload.single('file'), checkGroupMembership, sendGroupMessage);

router.patch("/:messageId/recall", recallMessage);
router.patch("/:messageId/edit", editMessage);
router.post("/:messageId/reaction", addReaction);

export default router;