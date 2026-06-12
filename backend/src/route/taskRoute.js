// route/taskRoute.js
import express from "express";
import { createTask, getTasks, updateTaskStatus, deleteTask } from "../controllers/taskController.js";

const router = express.Router();

router.get("/conversations/:conversationId/tasks", getTasks);
router.post("/conversations/:conversationId/tasks", createTask);
router.patch("/tasks/:taskId/status", updateTaskStatus);
router.delete("/tasks/:taskId", deleteTask);

export default router;
