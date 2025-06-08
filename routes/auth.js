import express from "express";
import {z} from "zod";
import { validateRequest } from "zod-express-middleware";
import { registerSchema ,loginSchema,verifyEmailSchema,resetPasswordSchema,emailSchema} from "../libs/validate-schema.js";
import { registerUser,loginUser,verifyEmail,resendVerificationEmail,resetPasswordRequest ,verifyResetPasswordTokenAndResetPassword} from "../controllers/auth-controller.js";

const router = express.Router();

router.post("/register",
  validateRequest({
    body:registerSchema
  }),
  
    registerUser
  
);
router.post("/login",
  validateRequest({
    body:loginSchema
  }),

    loginUser
  
);

// New email verification routes
// router.get("/verify", verifyEmail);

router.post("/verify-email",
  validateRequest({
    body: verifyEmailSchema,
  }),
  verifyEmail
)


router.post("/resend-verification",
  validateRequest({
    body: z.object({
      email: z.string().email("Invalid email format")
    })
  }),
  resendVerificationEmail
);

router.post("/reset-password-request",
  validateRequest({
    body:emailSchema,
  }),
  resetPasswordRequest
);

router.post("/reset-password",
  validateRequest({
    body:resetPasswordSchema,
  }),
  verifyResetPasswordTokenAndResetPassword
);

export default router;
