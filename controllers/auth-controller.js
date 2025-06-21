import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { rateLimiter } from "../libs/arcjet.js";
import { validateEmailWithAbstract } from "../libs/kickbox.js";
import { sendEmail } from "../libs/send-email.js";
import User from "../models/user.js";
import Verification from "../models/verification.js";

const registerUser = async (req, res) => {
	try {
		const { email, name, password } = req.body;

		// First validate the email specifically
		// Step 1: Validate email first
		// const emailDecision = await emailValidator.protect(req, { email });
		// console.log("Email validation decision:", emailDecision);

		// if (emailDecision.isDenied()) {
		//   return res.status(400).json({message: "Invalid email address"});
		// }

		const isValidEmail = await validateEmailWithAbstract(email);
		if (!isValidEmail) {
			return res
				.status(400)
				.json({ message: "Invalid or undeliverable email address" });
		}

		// Step 2: Apply rate limiting and other protections
		const rateLimitDecision = await rateLimiter.protect(req, { requested: 1 });

		if (rateLimitDecision.isDenied()) {
			const rateLimitResult = rateLimitDecision.results.find(
				(result) => result.reason.type === "RATE_LIMIT"
			);
			if (rateLimitResult && rateLimitResult.conclusion === "DENY") {
				return res
					.status(429)
					.json({ message: "Too many requests. Please try again later." });
			}
			return res.status(403).json({ message: "Request denied" });
		}

		const existingUser = await User.findOne({ email });

		if (existingUser) {
			res.status(400).json({
				message: "Email address already in use",
			});
		}

		const salt = await bcrypt.genSalt(10);

		const hasPassword = await bcrypt.hash(password, salt);

		const newUser = await User.create({
			email,
			password: hasPassword,
			name,
		});

		const verificationToken = jwt.sign(
			{ userId: newUser._id, purpose: "email-verification" },
			process.env.JWT_SECRET,
			{ expiresIn: "1h" }
		);

		await Verification.create({
			userId: newUser._id,
			token: verificationToken,
			expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000),
		});

		//send email
		const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

		const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to FlowState!</h2>
        <p>Hello ${name}, （。＾▽＾）</p>
        <p>Thank you for registering with us. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" 
             style="background-color: #d97706; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p><strong>This link will expire in 1 hour.</strong></p>
        <p>If you didn't create an account with us, please ignore this email.</p>
      </div>
    `;

		const emailSubject = "Verify Your Email Address";

		//send the email
		const emailResult = await sendEmail(email, emailSubject, emailBody);

		if (!emailResult.success) {
			// If email fails, you might want to delete the user or handle differently
			console.error("Failed to send verification email:", emailResult.error);
			return res.status(500).json({
				message:
					"Account created but failed to send verification email. Please contact support.",
			});
		}

		res.status(201).json({
			message:
				"Verification email sent to you email. Please check and verify you account.",
		});
	} catch (error) {
		console.log(error);
		res.status(500).json({ message: "Internal Server Error" });
	}
};

const verifyEmail = async (req, res) => {
	try {
		const { token } = req.body;
		//const {token} = req.query;

		//verify jwt token
		const payload = jwt.verify(token, process.env.JWT_SECRET);

		if (!payload) {
			return res
				.status(401)
				.json({ message: "Verification token is required" });
		}

		const { userId, purpose } = payload;

		if (purpose !== "email-verification") {
			return res.status(401).json({ message: "Invalid verification token" });
		}
		//Find verification record
		const verification = await Verification.findOne({
			token,
			userId: userId,
			// expiresAt: {$gt: new Date()}//check if not expired
		});

		if (!verification) {
			return res.status(400).json({
				message: "Invalid or expired verification token",
			});
		}

		const isTokenExpired = verification.expiresAt < new Date();

		if (isTokenExpired) {
			return res.status(401).json({ message: "Token Expired" });
		}

		const user = await User.findById(userId);

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		if (user.isEmailVerified) {
			return res.status(400).json({ message: "Email already verified" });
		}

		user.isEmailVerified = true;
		await user.save();

		await Verification.findByIdAndDelete(verification._id);

		res.status(200).json({
			message: "Email verified successfuly! You can now log in.",
			user: {
				id: user._id,
				email: user.email,
				name: user.name,
				isEmailVerified: user.isEmailVerified,
			},
		});
	} catch (error) {
		if (error.name === "JsonWebTokenError") {
			return res.status(400).json({ message: "Invalid verification token" });
		}
		if (error.name === "TokenExpiredError") {
			return res
				.status(400)
				.json({ message: "Verification token has expired" });
		}

		console.error("Email verification error:", error);
		res.status(500).json({ message: "Internal Server Error" });
	}
};

// Resend verification email
const resendVerificationEmail = async (req, res) => {
	try {
		const { email } = req.body;

		const user = await User.findOne({ email });
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		if (user.isEmailVerified) {
			return res.status(400).json({ message: "Email is already verified" });
		}

		// Delete existing verification tokens for this user
		await Verification.deleteMany({ userId: user._id });

		// Create new verification token
		const verificationToken = jwt.sign(
			{ userId: user._id, property: "email-verification" },
			process.env.JWT_SECRET,
			{ expiresIn: "1h" }
		);

		await Verification.create({
			userId: user._id,
			token: verificationToken,
			expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000),
		});

		// Send email
		const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
		const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Email Verification</h2>
        <p>Hello ${user.name},（。＾▽＾）</p>
        <p>Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" 
             style="background-color: #007bff; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p>This link will expire in 1 hour.</p>
      </div>
    `;

		const emailResult = await sendEmail(
			email,
			"Verify Your Email Address",
			emailBody
		);

		if (!emailResult.success) {
			return res.status(500).json({
				message: "Failed to send verification email",
			});
		}

		res.status(200).json({
			message: "Verification email sent successfully",
		});
	} catch (error) {
		console.error("Resend verification error:", error);
		res.status(500).json({ message: "Internal Server Error" });
	}
};

const loginUser = async (req, res) => {
	try {
		const { email, password } = req.body;

		const user = await User.findOne({ email }).select("+password");

		if (!user) {
			return res.status(400).json({ message: "Invalid Email or Password" });
		}

		if (!user.isEmailVerified) {
			const existingVerification = await Verification.findOne({
				userId: user._id,
			});

			if (
				!existingVerification ||
				existingVerification.expiresAt < new Date()
			) {
				const verificationToken = jwt.sign(
					{ userId: user._id, purpose: "email-verification" },
					process.env.JWT_SECRET,
					{ expiresIn: "1h" }
				);

				if (existingVerification) {
					await Verification.findByIdAndDelete(existingVerification._id);
				}

				await Verification.create({
					userId: user._id,
					token: verificationToken,
					expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000),
				});

				const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
				const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Verification</h2>
          <p>Hello ${user.name},（。＾▽＾）</p>
          <p>Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" 
               style="background-color: #d97706; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p>This link will expire in 1 hour.</p>
        </div>
      `;

				const emailResult = await sendEmail(
					email,
					"Verify Your Email Address",
					emailBody
				);

				if (!emailResult.success) {
					return res.status(500).json({
						message: "Failed to send verification email",
					});
				}

				return res.status(200).json({
					message: "Verification email sent successfully",
				});
			} else {
				return res.status(400).json({
					message:
						"Email not verified. Please check your email for the verification link",
				});
			}
		}

		const isPasswordValid = await bcrypt.compare(password, user.password);

		if (!isPasswordValid) {
			return res.status(400).json({ message: "Invalid email or password" });
		}

		const token = jwt.sign(
			{ userId: user._id, purpose: "login" },
			process.env.JWT_SECRET,
			{ expiresIn: "7d" }
		);

		user.lastLogin = new Date();
		await user.save();

		const userData = user.toObject();
		delete userData.password;

		res.status(200).json({
			message: "Login Successfull",
			token,
			user: userData,
		});
	} catch (error) {
		console.log(error);
		res.status(500).json({ message: "Internal Server Error" });
	}
};

const resetPasswordRequest = async (req, res) => {
	try {
		const { email } = req.body;

		const user = await User.findOne({ email });

		if (!user) {
			return res.status(400).json({ message: "User not found" });
		}

		if (!user.isEmailVerified) {
			return res.status(400).json({ message: "Please verify your email" });
		}

		const existingVerification = await Verification.findOne({
			userId: user._id,
		});

		if (existingVerification && existingVerification.expiresAt > new Date()) {
			return res.status(400).json({
				message: "Reset Password request sent successfully",
			});
		}

		if (existingVerification && existingVerification.expiresAt < new Date()) {
			await Verification.findByIdAndDelete(existingVerification._id);
		}

		const resetPasswordToken = jwt.sign(
			{ userId: user._id, purpose: "reset-password" },
			process.env.JWT_SECRET,
			{ expiresIn: "15m" }
		);

		await Verification.create({
			userId: user._id,
			token: resetPasswordToken,
			expiresAt: new Date(Date.now() + 15 * 60 * 1000),
		});

		const resetPasswordLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetPasswordToken}`;
		const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reporting From FlowState!</h2>
        <p>Hello User, （。＾▽＾）</p>
        <p>We got your request to change the Password. Please reset your Password by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetPasswordLink}" 
             style="background-color: #d97706; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Password
          </a>
        </div>
        <p><strong>This link will expire in 15 minutes.</strong></p>
        <p>If you didn't request for a password reset , please ignore this email.</p>
      </div>
    `;

		const emailSubject = "Reset Your Password";

		//send the email
		const emailResult = await sendEmail(email, emailSubject, emailBody);

		if (!emailResult) {
			return res.status(500).json({
				message: "Failed to send reset password email",
			});
		}

		res.status(200).json({ message: "Reset Password Email Sent" });
	} catch (error) {
		console.log(error);
		res.status(500).json({ message: "Internal Server Error" });
	}
};

const verifyResetPasswordTokenAndResetPassword = async (req, res) => {
	try {
		const { token, newPassword, confirmPassword } = req.body;

		const payload = jwt.verify(token, process.env.JWT_SECRET);

		if (!payload) {
			return res.status(401).json({ message: "Unauthorized" });
		}

		const { userId, purpose } = payload;

		if (purpose !== "reset-password") {
			return res.status(401).json({ message: "Unauthorized" });
		}

		const verification = await Verification.findOne({
			userId,
			token,
		});

		if (!verification) {
			res.status(401).json({ message: "Unauthorized" });
		}

		const isTokenExpired = verification.expiresAt < new Date();

		if (isTokenExpired) {
			return res.status(401).json({ message: "Token Expired" });
		}

		const user = await User.findById(userId);

		if (!user) {
			return res.status(401).json({ message: "Unauthorized" });
		}

		if (newPassword !== confirmPassword) {
			return res.status(400).json({ message: "Paswords do not match" });
		}

		const salt = await bcrypt.genSalt(10);

		const hasPassword = await bcrypt.hash(newPassword, salt);
		user.password = hasPassword;
		await user.save();

		await Verification.findByIdAndDelete(verification._id);

		res.status(200).json({ message: "Password reset Successfully" });
	} catch (error) {
		console.log(error);
		res.status(500).json({ message: "Internal Server Error" });
	}
};

export {
	loginUser,
	registerUser,
	resendVerificationEmail,
	resetPasswordRequest,
	verifyEmail,
	verifyResetPasswordTokenAndResetPassword,
};
