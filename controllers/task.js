import { recordActivity } from "../libs/index.js";
import Project from "../models/project.js";
import Task from "../models/task.js";
import Workspace from "../models/workspace.js";

const createTask = async (req, res) => {
	try {
		const { projectId } = req.params;
		const { title, description, status, priority, dueDate, assignees } =
			req.body;

		const project = await Project.findById(projectId);

		if (!project) {
			return res.status(404).json({
				message: "Project not found",
			});
		}

		const workspace = await Workspace.findById(project.workspace);

		if (!workspace) {
			return res.status(404).json({
				message: "Workspace not found",
			});
		}

		const isMember = workspace.members.some(
			(member) => member.user.toString() === req.user._id.toString()
		);

		if (!isMember) {
			return res.status(403).json({
				message: "You are not a member of this workspace",
			});
		}

		const newTask = await Task.create({
			title,
			description,
			status,
			priority,
			dueDate,
			assignees,
			project: projectId,
			createdBy: req.user._id,
		});

		project.tasks.push(newTask._id);
		await project.save();

		return res.status(201).json({ task: newTask, project: projectId });
	} catch (error) {
		console.log(error);
		return res.status(500).json({
			message: "Internal Server Error",
		});
	}
};

const getTaskById = async (req, res) => {
	try {
		const { taskId } = req.params;

		const task = await Task.findById(taskId)
			.populate("assignees", "name profilePicture")
			.populate("watchers", "name profilePicture");

		if (!task) {
			return res.status(404).json({
				message: "Task not found",
			});
		}

		const project = await Project.findById(task.project).populate(
			"members.user",
			"name profilePicture"
		);

		res.status(200).json({ task, project });
	} catch (error) {
		console.log(error);
		return res.status(500).json({
			message: "Internal server error",
		});
	}
};

const updateTaskTitle = async (req, res) => {
	try {
		const { taskId } = req.params;
		const { title } = req.body;

		const task = await Task.findById(taskId);

		if (!task) {
			return res.status(500).json({
				message: "Task not found",
			});
		}

		const project = await Project.findById(task.project);
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

		const oldTitle = task.title;

		// Actually update the task
		task.title = title;
		await task.save();

		//record Activity
		await recordActivity(req.user._id, "updated_task", "Task", taskId, {
			description: `Updated task title from ${oldTitle} to ${title}`,
		});

		return res.status(200).json({
			message: "Task title updated successfully",
			task,
		});
	} catch (error) {
		console.log(error);
		res.status(500).json({
			message: "Internal Server Error",
		});
	}
};

const updateTaskDescription = async (req, res) => {
	try {
		const { taskId } = req.params;
		const { description } = req.body;

		if (!description) {
			return res.status(400).json({
				message: "Description is required",
			});
		}

		const task = await Task.findById(taskId);
		if (!task) {
			return res.status(404).json({
				message: "Task not found",
			});
		}

		const project = await Project.findById(task.project);
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
				message: "Not a member of the project",
			});
		}

		const oldDescription = task.description
			? task.description.substring(0, 50) +
			  (task.description.length > 50 ? "..." : "")
			: "No description";

		task.description = description;
		await task.save();

		await recordActivity(req.user._id, "updated_task", "Task", taskId, {
			description: `Updated task description from "${oldDescription}" to "${description.substring(
				0,
				50
			)}${description.length > 50 ? "..." : ""}"`,
		});

		return res.status(200).json({
			message: "Task description updated successfully",
			task,
		});
	} catch (error) {
		console.error("Error updating task description:", error);
		res.status(500).json({
			message: "Internal Server Error",
			error: error.message,
		});
	}
};
const updateTaskStatus = async (req, res) => {
	try {
		const { taskId } = req.params;
		const { status } = req.body;

		const task = await Task.findById(taskId);

		if (!task) {
			return res.status(500).json({
				message: "Task not found",
			});
		}

		const project = await Project.findById(task.project);
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

		const oldStatus = task.status;

		// Actually update the task
		task.status = status;
		await task.save();

		//record Activity
		await recordActivity(req.user._id, "updated_task", "Task", taskId, {
			description: `Updated task status from ${oldStatus} to ${status} `,
		});

		return res.status(200).json({
			message: "Task title updated successfully",
			task,
		});
	} catch (error) {
		console.log(error);
		res.status(500).json({
			message: "Internal Server Error",
		});
	}
};

export {
	createTask,
	getTaskById,
	updateTaskDescription,
	updateTaskStatus,
	updateTaskTitle,
};
