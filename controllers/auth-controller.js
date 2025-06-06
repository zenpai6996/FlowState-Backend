import User from "../models/user.js"
import bcrypt from "bcrypt";

const registerUser = async (req,res) => {
  try{
    const {email,name,password} =req.body;

    const existingUser = await User.findOne({email})

    if(existingUser){
      res.status(400).json({
        message:"email address already in use",
      });
    }

    const salt = await bcrypt.genSalt(10)

    const hasPassword = await bcrypt.hash(password,salt);

    const newUser = await User.create({
      email,
      password:hasPassword,
      name,
    });

    //TODO: send email

    res.status(201).json({
      message:"Verification email sent to you email. Please check and verify you account."
    });

  }catch(error){
    console.log(error);
    res.status(500).json({message:"Internal Server Error"});
  }
};

const loginUser = async (req,res) => {
  try{

  }catch(error){
    console.log(error);
    res.status(500).json({message:"Internal Server Error"});
  }
};

export {registerUser,loginUser};