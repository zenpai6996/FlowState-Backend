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

export {
  registerSchema,loginSchema,verifyEmailSchema
};