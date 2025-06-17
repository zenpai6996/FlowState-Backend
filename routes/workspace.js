import express from "express";
import { z } from "zod";
import { validateRequest } from "zod-express-middleware";
import {
	acceptGeneralInvite,
	acceptInviteToken,
	createWorkspace,
	getWorkspaceDetails,
	getWorkspaceProjects,
	getWorkspaces,
	getWorkspaceStats,
	inviteToWorkspace,
} from "../controllers/workspace.js";
import {
	InviteMember,
	tokenSchema,
	workspaceSchema,
} from "../libs/validate-schema.js";
import { authMiddleware } from "../middleware/auth-middleware.js";

const router = express.Router();

router.post(
	"/",
	authMiddleware,
	validateRequest({ body: workspaceSchema }),
	createWorkspace
);

router.post(
	"/accept-invite-token",
	authMiddleware,
	validateRequest({ body: tokenSchema }),
	acceptInviteToken
);

router.post(
	"/:workspaceId/invite-member",
	authMiddleware,
	validateRequest({
		params: z.object({ workspaceId: z.string() }),
		body: InviteMember,
	}),
	inviteToWorkspace
);

router.post(
	"/:workspaceId/accept-general-invite",
	authMiddleware,
	validateRequest({
		params: z.object({ workspaceId: z.string() }),
	}),
	acceptGeneralInvite
);

router.get("/", authMiddleware, getWorkspaces);

router.get("/:workspaceId", authMiddleware, getWorkspaceDetails);

router.get("/:workspaceId/projects", authMiddleware, getWorkspaceProjects);

router.get("/:workspaceId/stats", authMiddleware, getWorkspaceStats);

export default router;
