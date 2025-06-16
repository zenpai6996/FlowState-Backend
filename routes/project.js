import express from "express";
import { z } from "zod";
import { validateRequest } from "zod-express-middleware";
import {
	createProject,
	getProjectDetails,
	getProjectTasks,
	updateProjectStatus,
} from "../controllers/project.js";
import { projectSchema } from "../libs/validate-schema.js";
import { authMiddleware } from "../middleware/auth-middleware.js";

const router = express.Router();

router.post(
	"/:workspaceId/create-project",
	authMiddleware,
	validateRequest({
		params: z.object({
			workspaceId: z.string(),
		}),
		body: projectSchema,
	}),
	createProject
);

router.get(
	"/:projectId",
	authMiddleware,
	validateRequest({
		params: z.object({
			projectId: z.string(),
		}),
	}),
	getProjectDetails
);

router.get(
	"/:projectId/tasks",
	authMiddleware,
	validateRequest({
		params: z.object({
			projectId: z.string(),
		}),
	}),
	getProjectTasks
);

router.put(
	"/:projectId/status",
	authMiddleware,
	validateRequest({
		params: z.object({ projectId: z.string() }),
		body: z.object({ status: z.string() }),
	}),
	updateProjectStatus
);
export default router;
