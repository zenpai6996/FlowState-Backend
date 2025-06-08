import {z} from "zod";

const registerSchema = z.object({
  name: z.string().min(1,"Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8,"Password must be atleast 8 characters long"),
});
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1,"Password is required"),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1,"Token is Required"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1,"Token is required"),
  newPassword:z.string().min(8,"Password must be atleast 8 charecters long"),
  confirmPassword:z.string().min(1,"Confirm password is required")
});

const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export {
  registerSchema,loginSchema,verifyEmailSchema,resetPasswordSchema,emailSchema
};