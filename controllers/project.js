import Project from "../models/project.js";
import Task from "../models/task.js";
import Workspace from "../models/workspace.js";

const createProject = async (req, res) => {
	try {
		const { workspaceId } = req.params;
		const { title, description, status, startDate, dueDate, tags, members } =
			req.body;
		const workspace = await Workspace.findById(workspaceId);

		if (!workspace) {
			return res.status(500).json({ message: "Workspace not found" });
		}

		const isMember = workspace.members.some(
			(member) => member.user.toString() === req.user._id.toString()
		);

		if (!isMember) {
			return res.status(401).json({
				message: "You are not a member of this workspace",
			});
		}

		const tagArray = tags ? tags.split(",") : [];

		const newProject = await Project.create({
			title,
			description,
			status,
			startDate,
			dueDate,
			tags: tagArray,
			workspace: workspaceId,
			members,
			createdBy: req.user._id,
		});

		workspace.projects.push(newProject._id);
		await workspace.save();

		return res.status(201).json({
			message: "Project Created Successfully",
			project: newProject,
			workspace: workspaceId,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).json({
			message: "Internal Server Error",
		});
	}
};

const getProjectDetails = async (req, res) => {
	try {
		const { projectId } = req.params;

		const project = await Project.findById(projectId);

		if (!project) {
			return res.status(404).json({
				message: "Project not found",
			});
		}

		const isMember = project.members.some(
			(member) => member.user.toString() === req.user._id.toString()
		);

		if (!isMember) {
			return res.status(403).json({
				message: "You are not a member of this project",
			});
		}

		return res.status(200).json(project);
	} catch (error) {
		console.log(error);
		return res.status(500).json({
			message: "Internal Server Error",
		});
	}
};

const getProjectTasks = async (req, res) => {
	try {
		const { projectId } = req.params;
		const project = await Project.findById(projectId).populate("members.user");

		if (!project) {
			return res.status(404).json({
				message: "Project not found",
			});
		}

		const workspace = await Workspace.findById(project.workspace);
		const isMember =
			project.members.some(
				(member) => member.user.toString() === req.user._id.toString()
			) ||
			workspace.members.some(
				(member) => member.user.toString() === req.user._id.toString()
			);

		if (!isMember) {
			return res.status(403).json({
				message: "You are not a member of this project",
			});
		}

		const tasks = await Task.find({
			project: projectId,
			isArchived: false,
		})
			.populate("assignees", "name profilePicture")
			.sort({ createdAt: -1 });

		return res.status(200).json({
			project,
			tasks,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).json({
			message: "Internal Server Error",
		});
	}
};

const updateProjectStatus = async (req, res) => {
	try {
		const { projectId } = req.params;
		const { status } = req.body;

		const project = await Project.findById(projectId);

		if (!project) {
			return res.status(500).json({
				message: "Project not found",
			});
		}

		const isMember = project.members.some(
			(member) => member.user.toString() === req.user._id.toString()
		);

		if (!isMember) {
			return res.status(500).json({
				message: "Not a member of the project",
			});
		}

		// Actually update the task
		project.status = status;
		await project.save();

		return res.status(200).json({
			message: "Task title updated successfully",
			project,
		});
	} catch (error) {
		console.log(error);
		res.status(500).json({
			message: "Internal Server Error",
		});
	}
};

export {
	createProject,
	getProjectDetails,
	getProjectTasks,
	updateProjectStatus,
};
