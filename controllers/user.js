import bcrypt from "bcrypt";
import User from "../models/user.js";

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
