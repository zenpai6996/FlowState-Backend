import jwt from "jsonwebtoken";
import User from "../models/user.js";

export const authMiddleware = async (req, res, next) => {
	try {
		const authHeader = req.headers.authorization;

		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return res
				.status(401)
				.json({ message: "Unauthorized: No token provided" });
		}

		const token = authHeader.split(" ")[1];

		try {
			const decoded = jwt.verify(token, process.env.JWT_SECRET);
			const user = await User.findById(decoded.userId);

			if (!user) {
				return res.status(401).json({ message: "Unauthorized: No user found" });
			}

			req.user = user;
			next();
		} catch (error) {
			if (error.name === "TokenExpiredError") {
				return res.status(401).json({
					message: "Session expired. Please log in again.",
					code: "TOKEN_EXPIRED",
				});
			}
			if (error.name === "JsonWebTokenError") {
				return res.status(401).json({
					message: "Invalid token. Please log in again.",
					code: "INVALID_TOKEN",
				});
			}
			throw error;
		}
	} catch (error) {
		console.log(error);
		res.status(500).json({ message: "Internal Server Error" });
	}
};
