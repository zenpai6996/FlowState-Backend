import { recordActivity } from "../libs/index.js";
import ActivityLog from "../models/activity.js";
import Comment from "../models/comment.js";
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

		const isMember =
			project.members.some(
				(member) => member.user.toString() === req.user._id.toString()
			) ||
			workspace.members.some(
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
			description: `Updated task title `,
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
			description: `Updated task description `,
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

const updateTaskPriority = async (req, res) => {
	try {
		const { taskId } = req.params;
		const { priority } = req.body;

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

		const oldPriority = task.priority;

		// Actually update the task
		task.priority = priority;
		await task.save();

		//record Activity
		await recordActivity(req.user._id, "updated_task", "Task", taskId, {
			description: `Updated task priority from ${oldPriority} to ${priority} `,
		});

		return res.status(200).json({
			message: "Task priority updated successfully",
			task,
		});
	} catch (error) {
		console.log(error);
		res.status(500).json({
			message: "Internal Server Error",
		});
	}
};

const updateTaskAssignees = async (req, res) => {
	try {
		const { taskId } = req.params;
		const { assignees } = req.body;

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

		const oldAssignees = task.assignees;

		// Actually update the task
		task.assignees = assignees;
		await task.save();

		//record Activity
		await recordActivity(req.user._id, "updated_task", "Task", taskId, {
			description: `Updated task assignee `,
		});

		return res.status(200).json({
			message: "Task assignee updated successfully",
			task,
		});
	} catch (error) {
		console.log(error);
		res.status(500).json({
			message: "Internal Server Error",
		});
	}
};

const addSubTask = async (req, res) => {
	try {
		const { taskId } = req.params;
		const { title } = req.body;

		const task = await Task.findById(taskId);

		if (!task) {
			return res.status(404).json({
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

		const newSubTask = {
			title,
			completed: false,
		};

		task.subtasks.push(newSubTask);
		await task.save();

		//record activity
		await recordActivity(req.user._id, "created_subtask", "Task", taskId, {
			description: `Created a subtask  `,
		});

		res.status(201).json(task);
	} catch (error) {
		console.log(error);
		res.status(500).json({
			message: "Internal Server Error",
		});
	}
};

const updateSubTask = async (req, res) => {
	try {
		const { taskId, subTaskId } = req.params;
		const { completed } = req.body;

		const task = await Task.findById(taskId);

		if (!task) {
			return res.status(404).json({
				message: "Task not found",
			});
		}

		const subTask = task.subtasks.find(
			(subtask) => subtask._id.toString() === subTaskId
		);

		if (!subTask) {
			return res.status(404).json({
				message: "Subtask not found",
			});
		}

		subTask.completed = completed;
		await task.save();

		//record activity
		await recordActivity(req.user._id, "updated_subtask", "Task", taskId, {
			description: `updated a subtask `,
		});

		res.status(201).json(task);
	} catch (error) {
		console.log(error);
		res.status(500).json({
			message: "Internal Server Error",
		});
	}
};

const deleteSubTask = async (req, res) => {
	try {
		const { taskId, subTaskId } = req.params;

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
				message: "Not authorized",
			});
		}

		// Find and remove the subtask
		const subTaskIndex = task.subtasks.findIndex(
			(subtask) => subtask._id.toString() === subTaskId
		);

		if (subTaskIndex === -1) {
			return res.status(404).json({
				message: "Subtask not found",
			});
		}

		const deletedSubTask = task.subtasks[subTaskIndex];
		task.subtasks.splice(subTaskIndex, 1);
		await task.save();

		// Record activity
		await recordActivity(req.user._id, "deleted_subtask", "Task", taskId, {
			description: `deleted a subtask`,
		});

		res.status(200).json({
			message: "Subtask deleted successfully",
			task,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			message: "Internal Server Error",
		});
	}
};

const updateSubTaskTitle = async (req, res) => {
	try {
		const { taskId, subTaskId } = req.params;
		const { title } = req.body;

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

		const subTask = task.subtasks.find(
			(subtask) => subtask._id.toString() === subTaskId
		);
		if (!subTask) {
			return res.status(404).json({
				message: "Subtask not found",
			});
		}

		const oldTitle = subTask.title;
		subTask.title = title;
		await task.save();

		// Record activity
		await recordActivity(req.user._id, "edited_subtask", "Task", taskId, {
			description: `Updated a subtask title`,
		});

		res.status(200).json({
			message: "Subtask updated successfully",
			task,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			message: "Internal Server Error",
		});
	}
};

const getActivity = async (req, res) => {
	try {
		const { resourceId } = req.params;

		const activity = await ActivityLog.find({ resourceId })
			.populate("user", "name profilePicture")
			.sort({
				createdAt: -1,
			});

		if (!activity) {
			return res.status(404).json({
				message: "Activity not found",
			});
		}

		res.status(200).json(activity);
	} catch (error) {
		console.log(error);
		return res.status(500).json({
			message: "Internal server error",
		});
	}
};

const getCommentByTaskId = async (req, res) => {
	try {
		const { taskId } = req.params;

		const comments = await Comment.find({ task: taskId })
			.populate("author", "name profilePicture")
			.sort({
				createdAt: -1,
			});

		if (!comments) {
			return res.status(404).json({
				message: "Comment not found",
			});
		}

		res.status(200).json(comments);
	} catch (error) {
		console.log(error);
		return res.status(500).json({
			message: "Internal server error",
		});
	}
};

const addComment = async (req, res) => {
	try {
		const { taskId } = req.params;
		const { text } = req.body;

		const task = await Task.findById(taskId);

		if (!task) {
			return res.status(404).json({
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

		const newComment = await Comment.create({
			text,
			task: taskId,
			author: req.user._id,
		});

		task.comments.push(newComment._id);
		await task.save();

		//record activity
		await recordActivity(req.user._id, "added_comment", "Task", taskId, {
			description: `posted a comment`,
		});

		res.status(201).json(task);
	} catch (error) {
		console.log(error);
		res.status(500).json({
			message: "Internal Server Error",
		});
	}
};

const watchTask = async (req, res) => {
	try {
		const { taskId } = req.params;

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
				message: "Not a member of the project",
			});
		}

		const isWatching = task.watchers.includes(req.user._id);

		if (isWatching) {
			task.watchers = task.watchers.filter(
				(watcher) => watcher.toString() !== req.user._id.toString()
			);
			const IsWatched = task.isWatched;
			task.isWatched = !IsWatched;
		} else {
			task.watchers.push(req.user._id);
		}

		await task.save();

		await recordActivity(req.user._id, "updated_task", "Task", taskId, {
			description: `${
				isWatching ? "Stopped watching" : "Started Watching"
			} task ${task.title}`,
		});

		res.status(200).json(task);
	} catch (error) {
		console.log(error);
		res.status(500).json({
			message: "Internal Server Error",
		});
	}
};

const archiveTask = async (req, res) => {
	try {
		const { taskId } = req.params;

		const task = await Task.findById(taskId);

		if (!task) {
			return res.status(404).json({
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

		const isAssignee = task.assignees.some(
			(assignee) => assignee.toString() === req.user._id.toString()
		);

		if (!isAssignee) {
			return res.status(403).json({
				message: "Only task assignees can delete this task",
			});
		}

		const IsArchived = task.isArchived;
		task.isArchived = !IsArchived;

		await task.save();

		//record activity
		await recordActivity(req.user._id, "archived_task", "Task", taskId, {
			description: `${IsArchived ? "Unarchived" : "Archived"} task ${
				task.title
			}`,
		});

		res.status(201).json(task);
	} catch (error) {
		console.log(error);
		res.status(500).json({
			message: "Internal Server Error",
		});
	}
};

const deleteTask = async (req, res) => {
	try {
		const { taskId } = req.params;

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

		// Check if user is an assignee
		const isAssignee = task.assignees.some(
			(assignee) => assignee.toString() === req.user._id.toString()
		);

		if (!isAssignee) {
			return res.status(403).json({
				message: "Only task assignees can delete this task",
			});
		}

		// Remove task from project
		project.tasks = project.tasks.filter(
			(t) => t.toString() !== taskId.toString()
		);
		await project.save();

		// Delete the task
		await Task.findByIdAndDelete(taskId);

		// Record activity
		await recordActivity(req.user._id, "deleted_task", "Task", taskId, {
			description: `Deleted task `,
		});

		res.status(200).json({
			message: "Task deleted successfully",
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			message: "Internal Server Error",
		});
	}
};

const getmyTasks = async (req, res) => {
	try {
		const tasks = await Task.find({ assignees: { $in: [req.user._id] } })
			.populate("project", "title workspace")
			.sort({
				createdAt: -1,
			});

		res.status(200).json(tasks);
	} catch (error) {
		console.log(error);
		return res.status(500).json({
			message: "Internal server error",
		});
	}
};

export {
	addComment,
	addSubTask,
	archiveTask,
	createTask,
	deleteSubTask,
	deleteTask,
	getActivity,
	getCommentByTaskId,
	getmyTasks,
	getTaskById,
	updateSubTask,
	updateSubTaskTitle,
	updateTaskAssignees,
	updateTaskDescription,
	updateTaskPriority,
	updateTaskStatus,
	updateTaskTitle,
	watchTask,
};
