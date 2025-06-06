import express from "express";
import {z} from "zod";
import { validateRequest } from "zod-express-middleware";
import { registerSchema } from "../libs/validate-schema.js";
import { registerUser } from "../controllers/auth-controller.js";

const router = express.Router();

router.post("/register",
  validateRequest({
    body:registerSchema
  }),
  async (req,res) => {
    registerUser
  }
)

export default router;
