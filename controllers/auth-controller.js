import User from "../models/user.js"
import bcrypt from "bcrypt";
import Verification from "../models/verification.js";
import jwt from "jsonwebtoken";
import { sendEmail } from "../libs/send-email.js";
import { emailValidator, rateLimiter } from "../libs/arcjet.js";

const registerUser = async (req,res) => {
  try{
    const {email,name,password} =req.body;

       // First validate the email specifically
     // Step 1: Validate email first
    const emailDecision = await emailValidator.protect(req, { email });
    console.log("Email validation decision:", emailDecision);

    if (emailDecision.isDenied()) {
      return res.status(400).json({message: "Invalid email address"});
    }

    // Step 2: Apply rate limiting and other protections
    const rateLimitDecision = await rateLimiter.protect(req, { requested: 1 });
    console.log("Rate limit decision:", rateLimitDecision);

    if (rateLimitDecision.isDenied()) {
      const rateLimitResult = rateLimitDecision.results.find(result => result.reason.type === 'RATE_LIMIT');
      if (rateLimitResult && rateLimitResult.conclusion === 'DENY') {
        return res.status(429).json({message: "Too many requests. Please try again later."});
      }
      return res.status(403).json({message: "Request denied"});
    }

    const existingUser = await User.findOne({email})

    if(existingUser){
      res.status(400).json({
        message:"Email address already in use",
      });
    }

    const salt = await bcrypt.genSalt(10)

    const hasPassword = await bcrypt.hash(password,salt);

    const newUser = await User.create({
      email,
      password:hasPassword,
      name,
    });

    const verificationToken = jwt.sign(
      {userId: newUser._id,property:"email-verification"},
      process.env.JWT_SECRET,
      {expiresIn: "1h"}
    );

    await Verification.create({
      userId : newUser._id,
      token: verificationToken,
      expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000),
    });

    //send email
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

       const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to FlowState!</h2>
        <p>Hello ${name},</p>
        <p>Thank you for registering with us. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" 
             style="background-color: #007bff; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationLink}</p>
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
        message: "Account created but failed to send verification email. Please contact support."
      });
    }

    res.status(201).json({
      message:"Verification email sent to you email. Please check and verify you account."
    });

  }catch(error){
    console.log(error);
    res.status(500).json({message:"Internal Server Error"});
  }
};

const verifyEmail = async (req, res) => {
  try{
    const {token} = req.query;

    if(!token){
      return res.status(400).json({message:"Verification token is required"});
    }

    //verify jwt token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if(decoded.property !== "email-verification") {
      return res.status(400).sjon({message:"Invalid verification token"});
    }

    //Find verification record 
    const verification = await Verification.findOne({
      token,
      userId:decoded.userId,
      expiresAt: {$gt: new Date()}//check if not expired 
    });

    if(!verification){
      return res.status(400).json({
        message:"Invalid or expired verification token"
      });
    }

    const user = await User.findByIdAndUpdate(decoded.userId,
      {isEmailVerified:true},
      {new:true}
    );

    if(!user){
      return res.status(404).json({message:"User not found"});
    }

    await Verification.deleteOne({_id:verification._id});

    res.status(200).json({
      message:"Email verified successfuly! You can now log in.",
      user:{
        id:user._id,
        email:user.email,
        name:user.name,
        isEmailVerified:user.isEmailVerified
      }
    });
  }catch(error){
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({ message: "Invalid verification token" });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: "Verification token has expired" });
    }
    
    console.error("Email verification error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

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
        <p>Hello ${user.name},</p>
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

    const emailResult = await sendEmail(email, "Verify Your Email Address", emailBody);

    if (!emailResult.success) {
      return res.status(500).json({
        message: "Failed to send verification email"
      });
    }

    res.status(200).json({
      message: "Verification email sent successfully"
    });

  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const loginUser = async (req,res) => {
  try{

  }catch(error){
    console.log(error);
    res.status(500).json({message:"Internal Server Error"});
  }
};

export {registerUser,loginUser,verifyEmail,resendVerificationEmail};