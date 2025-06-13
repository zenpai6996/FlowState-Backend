import express from "express";
import { z } from "zod";
import { validateRequest } from "zod-express-middleware";
import {
	createTask,
	getTaskById,
	updateTaskTitle,
} from "../controllers/task.js";
import { taskSchema } from "../libs/validate-schema.js";
import { authMiddleware } from "../middleware/auth-middleware.js";

const router = express.Router();

router.post(
	"/:projectId/create-task",
	authMiddleware,
	validateRequest({
		params: z.object({
			projectId: z.string(),
		}),
		body: taskSchema,
	}),
	createTask
);

router.put(
	"/:taskId/title",
	authMiddleware,
	validateRequest({
		params: z.object({ taskId: z.string() }),
		body: z.object({ title: z.string() }),
	}),
	updateTaskTitle
);

router.get(
	"/:taskId",
	authMiddleware,
	validateRequest({
		params: z.object({
			taskId: z.string(),
		}),
	}),
	getTaskById
);

export default router;
