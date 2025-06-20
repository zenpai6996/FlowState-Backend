import jwt from "jsonwebtoken";
import { recordActivity } from "../libs/index.js";
import { sendEmail } from "../libs/send-email.js";
import Project from "../models/project.js";
import User from "../models/user.js";
import WorkspaceInvite from "../models/workspace-invite.js";
import Workspace from "../models/workspace.js";

const createWorkspace = async (req, res) => {
	try {
		const { name, description, color } = req.body;

		const workspace = new Workspace({
			name,
			description,
			color,
			owner: req.user._id, // Assuming req.user is set by auth middleware
			members: [
				{
					user: req.user._id, // Add the owner as a member
					role: "admin", // Owner is an admin
					joinedAt: new Date(),
				},
			],
		});
		await workspace.save(); // Save to database before responding

		res.status(201).json(workspace);
	} catch (error) {
		console.log(error);
		res.status(500).json({ message: "Internal Server Error" });
	}
};

const getWorkspaces = async (req, res) => {
	try {
		const workspaces = await Workspace.find({
			"members.user": req.user._id, // Find workspaces where the user is a member
		}).sort({ createdAt: -1 }); // Sort by creation date, most recent first
		res.status(200).json(workspaces);
	} catch (error) {
		console.log(error);
		res.status(500).json({ message: "Internal Server Error" });
	}
};

const getWorkspaceDetails = async (req, res) => {
	try {
		const { workspaceId } = req.params;
		const workspace = await Workspace.findById({
			_id: workspaceId,
		}).populate("members.user", "name email profilePicture");
		if (!workspace) {
			return res.status(404).json({
				message: "Workspace not found",
			});
		}

		res.status(200).json(workspace);
	} catch (error) {
		console.log(error);
		res.status(500).json({
			message: "Internal Server Error",
		});
	}
};

const getWorkspaceProjects = async (req, res) => {
	try {
		const { workspaceId } = req.params;
		const workspace = await Workspace.findOne({
			_id: workspaceId,
			"members.user": req.user._id,
		}).populate("members.user", "name email profilePicture");

		if (!workspace) {
			return res.status(404).json({
				message: "Workspace not found",
			});
		}

		const projects = await Project.find({
			workspace: workspaceId,
			isArchived: false,
			// members:{$in: [req.user._id]},
		})
			// .populate("tasks","status")
			.sort({ createdAt: -1 });

		res.status(200).json({ projects, workspace });
	} catch (error) {
		console.log(error);
		res.status(500).json({
			message: "Internal Server Error",
		});
	}
};

const getWorkspaceStats = async (req, res) => {
	try {
		const { workspaceId } = req.params;
		const workspace = await Workspace.findById(workspaceId);

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
				message: "Not a member of this workspace",
			});
		}

		const [totalProjects, projects] = await Promise.all([
			Project.countDocuments({ workspace: workspaceId }),
			Project.find({ workspace: workspaceId })
				.populate({
					path: "tasks",
					select: "title status dueDate project updatedAt isArchived priority",
					model: "Task",
				})
				.sort({ createdAt: -1 }),
		]);

		const totalTasks = projects.reduce((acc, project) => {
			return acc + project.tasks.length;
		}, 0);

		const totalProjectInProgress = projects.filter(
			(project) => project.status === "In Progress"
		).length;
		const totalProjectCompleted = projects.filter(
			(project) => project.status === "Completed"
		).length;
		const totalProjectPlanning = projects.filter(
			(project) => project.status === "Planning"
		).length;
		const totalProjectCancelled = projects.filter(
			(project) => project.status === "Cancelled"
		).length;
		const totalProjectOnHold = projects.filter(
			(project) => project.status === "On Hold"
		).length;

		const totalTasksCompleted = projects.reduce((acc, project) => {
			return (
				acc + project.tasks.filter((task) => task.status === "Done").length
			);
		}, 0);
		const totalTasksTodo = projects.reduce((acc, project) => {
			return (
				acc + project.tasks.filter((task) => task.status === "To Do").length
			);
		}, 0);
		const totalTasksInProgress = projects.reduce((acc, project) => {
			return (
				acc +
				project.tasks.filter((task) => task.status === "In Progress").length
			);
		}, 0);
		const tasks = projects.flatMap((project) => project.tasks);

		//get upcoming task in next 7 days
		const upcomingTasks = tasks.filter((task) => {
			const taskDate = new Date(task.dueDate);
			const today = new Date();
			return (
				taskDate > today &&
				taskDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
			);
		});

		const taskTrendsData = [
			{ name: "Sun", completed: 0, inProgress: 0, toDo: 0 },
			{ name: "Mon", completed: 0, inProgress: 0, toDo: 0 },
			{ name: "Tue", completed: 0, inProgress: 0, toDo: 0 },
			{ name: "Wed", completed: 0, inProgress: 0, toDo: 0 },
			{ name: "Thu", completed: 0, inProgress: 0, toDo: 0 },
			{ name: "Fri", completed: 0, inProgress: 0, toDo: 0 },
			{ name: "Sat", completed: 0, inProgress: 0, toDo: 0 },
		];

		//get last 7 days task completion data
		const last7DaysTask = Array.from({ length: 7 }, (_, i) => {
			const date = new Date();
			date.setDate(date.getDate() - i);
			return date;
		}).reverse();

		//populate
		for (const project of projects) {
			for (const task of project.tasks) {
				const taskDate = new Date(task.updatedAt);

				const dayInDate = last7DaysTask.findIndex(
					(date) =>
						date.getDate() === taskDate.getDate() &&
						date.getMonth() === taskDate.getMonth() &&
						date.getFullYear() === taskDate.getFullYear()
				);

				if (dayInDate !== -1) {
					const dayName = last7DaysTask[dayInDate].toLocaleDateString("en-us", {
						weekday: "short",
					});
					const dayData = taskTrendsData.find((day) => day.name === dayName);

					if (dayData) {
						switch (task.status) {
							case "Done":
								dayData.completed++;
								break;
							case "In Progress":
								dayData.inProgress++;
								break;
							case "To Do":
								dayData.toDo++;
								break;
						}
					}
				}
			}
		}

		//project status distribution
		const projectStatusData = [
			{ name: "Completed", value: 0, color: "#10b981" },
			{ name: "In Progress", value: 0, color: "#3b82f6" },
			{ name: "Planning", value: 0, color: "#8E44AD" },
			{ name: "Cancelled", value: 0, color: "#C0392B" },
			{ name: "On Hold", value: 0, color: "#F39C12" },
		];

		for (const project of projects) {
			switch (project.status) {
				case "Completed":
					projectStatusData[0].value++;
					break;
				case "In Progress":
					projectStatusData[1].value++;
					break;
				case "Planning":
					projectStatusData[2].value++;
					break;
				case "Cancelled":
					projectStatusData[3].value++;
					break;
				case "On Hold":
					projectStatusData[4].value++;
					break;
			}
		}

		//Task status Distribution
		const TaskPriorityData = [
			{ name: "High", value: 0, color: "#ef4444" },
			{ name: "Medium", value: 0, color: "#f59e0b" },
			{ name: "Low", value: 0, color: "#6b7280" },
		];

		for (const task of tasks) {
			switch (task.priority) {
				case "High":
					TaskPriorityData[0].value++;
					break;
				case "Medium":
					TaskPriorityData[1].value++;
					break;
				case "Low":
					TaskPriorityData[2].value++;
					break;
			}
		}

		const workspaceProductivityData = [];

		for (const project of projects) {
			const projectTask = tasks.filter(
				(task) => task.project.toString() === project._id.toString()
			);
			const completedTask = projectTask.filter(
				(task) => task.status === "Done" && task.isArchived === false
			);
			const inProgressTask = projectTask.filter(
				(task) => task.status === "In Progress" && task.isArchived === false
			);
			const inToDoTask = projectTask.filter(
				(task) => task.status === "To Do" && task.isArchived === false
			);
			workspaceProductivityData.push({
				name: project.title,
				completed: completedTask.length,
				total: projectTask.length,
				inProgress: inProgressTask.length,
				toDo: inToDoTask.length,
			});
		}

		const stats = {
			totalProjects,
			totalTasks,
			totalProjectInProgress,
			totalTasksCompleted,
			totalTasksTodo,
			totalTasksInProgress,
			totalProjectCompleted,
			totalProjectPlanning,
			totalProjectCancelled,
			totalProjectOnHold,
		};

		res.status(200).json({
			stats,
			taskTrendsData,
			projectStatusData,
			TaskPriorityData,
			workspaceProductivityData,
			upcomingTasks,
			recentProjects: projects.slice(0, 3),
		});
	} catch (error) {
		console.log(error);
		res.status(500).json({
			message: "Internal Server Error",
		});
	}
};

const inviteToWorkspace = async (req, res) => {
	try {
		const { workspaceId } = req.params;
		const { email, role } = req.body;

		const workspace = await Workspace.findById(workspaceId);

		if (!workspace) {
			return res.status(404).json({
				message: "Workspace not found",
			});
		}

		const userMemberInfo = workspace.members.find(
			(member) => member.user.toString() === req.user._id.toString()
		);

		if (!userMemberInfo || !["admin", "owner"].includes(userMemberInfo.role)) {
			return res.status(403).json({
				message: "You are not authorized to invite members to this workspace",
			});
		}

		const existingUser = await User.findOne({ email });

		if (!existingUser) {
			res.status(400).json({
				message: "User not found",
			});
		}

		const isMember = workspace.members.some(
			(member) => member.user.toString() === existingUser._id.toString()
		);

		if (isMember) {
			return res.status(400).json({ message: "User is already a member" });
		}

		const isInvited = await WorkspaceInvite.findOne({
			user: existingUser._id,
			workspaceId: workspaceId,
		});

		if (isInvited && isInvited.expiresAt > new Date()) {
			res.status(400).json({
				message: "User already invited to this workpsace",
			});
		}

		if (isInvited && isInvited.expiresAt < new Date()) {
			await WorkspaceInvite.deleteOne({ _id: isInvited._id });
		}

		const inviteToken = jwt.sign(
			{
				user: existingUser._id,
				workspaceId: workspaceId,
				role: role || "member",
			},
			process.env.JWT_SECRET,
			{ expiresIn: "3d" }
		);

		await WorkspaceInvite.create({
			user: existingUser._id,
			workspaceId: workspaceId,
			token: inviteToken,
			role: role || "member",
			expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
		});

		const invitationLink = `${process.env.FRONTEND_URL}/workspace-invite/${workspace._id}/?tk=${inviteToken}`;

		const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Reporting from FlowState!</h2>
      <p>Hello User, （。＾▽＾）</p>
      <p>You have been invited to join <span style="color: #d97706">${workspace.name}</span> </p>
      <p> You can join by clicking the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${invitationLink}" 
           style="background-color: #d97706; color: white; padding: 12px 30px; 
                  text-decoration: none; border-radius: 5px; display: inline-block;">
          Join ${workspace.name}
        </a>
      </div>
      <p><strong>This link will expire in 3 days.</strong></p>
      <p>If you didn't create an account with us, please ignore this email.</p>
    </div>
  `;

		await sendEmail(
			email,
			"You have been invited to join a workspace!!",
			emailContent
		);
		res.status(200).json({
			message: "Invite sent Succesfully!",
		});
	} catch (error) {
		console.log(error);
		res.status(500).json({ message: "Internal Server Error" });
	}
};

const acceptGeneralInvite = async (req, res) => {
	try {
		const { workspaceId } = req.params;

		const workspace = await WorkspaceInvite.findById(workspaceId);

		if (!workspace) {
			return res.status(404).json({
				message: "Workspace not found",
			});
		}

		const isMember = workspace.members.some(
			(member) => member.user.toString() === req.user._id.toString()
		);

		if (isMember) {
			return res.status(400).json({ message: "User is already a member" });
		}

		workspace.members.push({
			user: req.user._id,
			role: "member",
			joinedAt: new Date(),
		});

		await workspace.save();

		await recordActivity(req.user._id, "joined_workspace", workspaceId, {
			description: `joined ${workspace.name} workspace`,
		});

		res.status(200).json({
			message: "Invitation sent successfully!",
		});
	} catch (error) {
		console.log(error);
		res.status(500).json({ message: "Internal Server Error" });
	}
};

const acceptInviteToken = async (req, res) => {
	const { token } = req.body;
	const decoded = jwt.verify(token, process.env.JWT_SECRET);
	const { user, workspaceId, role } = decoded;
	const workspace = await Workspace.findById(workspaceId);

	if (!workspace) {
		return res.status(404).json({
			message: "Workspace not found",
		});
	}

	const isMember = workspace.members.some(
		(member) => member.user.toString() === user.toString()
	);

	if (isMember) {
		return res.status(400).json({ message: "User is already a member" });
	}

	const inviteInfo = await WorkspaceInvite.findOne({
		user: user,
		workspaceId: workspaceId,
	});

	if (!inviteInfo) {
		return res.status(404).json({
			message: "Invitation not found",
		});
	}

	if (inviteInfo.expiresAt < new Date()) {
		return res.status(400).json({
			message: "Invitation has expired",
		});
	}

	workspace.members.push({
		user: user,
		role: role || "member",
		joinedAt: new Date(),
	});

	await workspace.save();

	await Promise.all([
		WorkspaceInvite.deleteOne({ _id: inviteInfo._id }),
		recordActivity(user, "joined_workspace", workspaceId, {
			description: `joined ${workspace.name} workpsace`,
		}),
	]);

	res.status(200).json({
		message: "Invitation sent successfully!",
	});

	try {
	} catch (error) {
		console.log(error);
		res.status(500).json({ message: "Internal Server Error" });
	}
};

export {
	acceptGeneralInvite,
	acceptInviteToken,
	createWorkspace,
	getWorkspaceDetails,
	getWorkspaceProjects,
	getWorkspaces,
	getWorkspaceStats,
	inviteToWorkspace,
};
