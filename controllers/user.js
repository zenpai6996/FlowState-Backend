import bcrypt from "bcrypt";
import fs from "fs";
import multer from "multer";
import path from "path";
import User from "../models/user.js";

// Configure multer storage
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		const uploadPath = "uploads/profile-pictures";
		fs.mkdirSync(uploadPath, { recursive: true });
		cb(null, uploadPath);
	},
	filename: function (req, file, cb) {
		const ext = path.extname(file.originalname);
		const uniqueName = `${req.user._id}_${Date.now()}${ext}`;
		cb(null, uniqueName);
	},
});

export const upload = multer({
	storage: storage,
	limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
	fileFilter: (req, file, cb) => {
		if (file.mimetype.startsWith("image/")) cb(null, true);
		else cb(new Error("Only image files allowed"), false);
	},
}).single("profilePicture");

export const uploadProfilePicture = async (req, res) => {
	if (!req.file) {
		return res.status(400).json({ message: "No file uploaded" });
	}

	const user = await User.findById(req.user._id);
	if (!user) return res.status(404).json({ message: "User not found" });

	user.profilePicture = `https://flowstate-backend.onrender.com/profile-pictures/${req.file.filename}`;
	await user.save();

	res.status(200).json({
		message: "Profile picture updated successfully",
		profilePicture: user.profilePicture,
	});
};

const getUserProfile = async (req, res) => {
	try {
		const user = await User.findById(req.user.id).select("-password");

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		delete user.password;
		res.status(200).json(user);
	} catch (error) {
		console.error("Error fetching user profile:", error);
		res.status(500).json({ message: "Server error" });
	}
};

const updateUserProfile = async (req, res) => {
	try {
		const { name, profilePicture } = req.body;

		const user = await User.findById(req.user._id);

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		user.name = name;
		user.profilePicture = profilePicture;
		await user.save();
		res.status(200).json(user);
	} catch (error) {
		console.error("Error fetching user profile:", error);
		res.status(500).json({ message: "Server error" });
	}
};

const changePassword = async (req, res) => {
	try {
		const { currentPassword, newPassword, confirmPassword } = req.body;
		const user = await User.findById(req.user._id).select("+password");
		if (!user) {
			return res.status(404).json({
				message: "User not found",
			});
		}
		if (newPassword !== confirmPassword) {
			return res.status(400).json({
				message: "Passwords donot match",
			});
		}

		const isPassowrdValid = await bcrypt.compare(
			currentPassword,
			user.password
		);

		if (!isPassowrdValid) {
			return res.status(403).json({
				message: "Password already used",
			});
		}

		const hashpassword = await bcrypt.hash(newPassword, 10);

		user.password = hashpassword;
		await user.save();

		res.status(200).json({
			message: "Password updated succesfully",
		});
	} catch (error) {
		console.error("Internal Server Error", error);
		res.status(500).json({ message: "Internal server error" });
	}
};
export { changePassword, getUserProfile, updateUserProfile };
