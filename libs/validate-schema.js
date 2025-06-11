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

const workspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required"),
  description: z.string().optional(),
  color: z.string().min(1,"Color is required"),
});

const projectSchema = z.object({
  title:z.string().min(3,"Title is required"),
  description:z.string().optional(),
  status:z.enum([
    "Planning",
    "In Progress",
    "On Hold",
    "Completed",
    "Cancelled",
  ]),
  startDate:z.string(),
  dueDate:z.string().optional(),
  tags:z.string().optional(),
  members:z.array(z.object({
    user:z.string(),
    role:z.enum(["manager","contributor","viewer"]),
  })).optional(),
});

export {
  registerSchema,loginSchema,verifyEmailSchema,resetPasswordSchema,emailSchema,workspaceSchema,projectSchema
};