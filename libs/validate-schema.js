import {z} from "zod";

const registerSchema = z.object({
  name: z.string().min(1,"Name is required"),
  email: z.string().email("Invalid email address"),
  Password: z.string().min(8,"Password must be atleast 8 characters long"),
});

export {
  registerSchema
};