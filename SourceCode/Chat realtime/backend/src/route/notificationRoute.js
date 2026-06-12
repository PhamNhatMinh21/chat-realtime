import express from "express";
import { protectedRoute } from "../middlewares/authMiddleware.js";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications
} from "../controllers/notificationController.js";

const router = express.Router();

router.use(protectedRoute);

router.get("/", getNotifications);
router.patch("/mark-read", markAllNotificationsRead);
router.patch("/:id/read", markNotificationRead);
router.delete("/", clearAllNotifications);
router.delete("/:id", deleteNotification);

export default router;
