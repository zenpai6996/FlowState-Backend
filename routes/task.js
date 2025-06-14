import express from "express";
import { z } from "zod";
import { validateRequest } from "zod-express-middleware";
import {
	addSubTask,
	createTask,
	deleteSubTask,
	getActivity,
	getTaskById,
	updateSubTask,
	updateSubTaskTitle,
	updateTaskAssignees,
	updateTaskDescription,
	updateTaskPriority,
	updateTaskStatus,
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

router.post(
	"/:taskId/add-subtask",
	authMiddleware,
	validateRequest({
		params: z.object({ taskId: z.string() }),
		body: z.object({ title: z.string() }),
	}),
	addSubTask
);

router.put(
	"/:taskId/update-subtask/:subTaskId",
	authMiddleware,
	validateRequest({
		params: z.object({ taskId: z.string(), subTaskId: z.string() }),
		body: z.object({ completed: z.boolean() }),
	}),
	updateSubTask
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

router.put(
	"/:taskId/description",
	authMiddleware,
	validateRequest({
		params: z.object({ taskId: z.string() }),
		body: z.object({ description: z.string() }),
	}),
	updateTaskDescription
);

router.put(
	"/:taskId/status",
	authMiddleware,
	validateRequest({
		params: z.object({ taskId: z.string() }),
		body: z.object({ status: z.string() }),
	}),
	updateTaskStatus
);

router.put(
	"/:taskId/priority",
	authMiddleware,
	validateRequest({
		params: z.object({ taskId: z.string() }),
		body: z.object({ priority: z.string() }),
	}),
	updateTaskPriority
);

router.put(
	"/:taskId/assignees",
	authMiddleware,
	validateRequest({
		params: z.object({ taskId: z.string() }),
		body: z.object({ assignees: z.array(z.string()) }),
	}),
	updateTaskAssignees
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

// Add these new routes
router.delete(
	"/:taskId/subtasks/:subTaskId",
	authMiddleware,
	validateRequest({
		params: z.object({
			taskId: z.string(),
			subTaskId: z.string(),
		}),
	}),
	deleteSubTask
);

router.put(
	"/:taskId/subtasks/:subTaskId/title",
	authMiddleware,
	validateRequest({
		params: z.object({
			taskId: z.string(),
			subTaskId: z.string(),
		}),
		body: z.object({
			title: z.string(),
		}),
	}),
	updateSubTaskTitle
);

router.get(
	"/:resourceId/activity",
	authMiddleware,
	validateRequest({
		params: z.object({ resourceId: z.string() }),
	}),
	getActivity
);

export default router;
