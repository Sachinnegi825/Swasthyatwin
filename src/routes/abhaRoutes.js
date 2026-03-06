import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  startAbhaEnrollment,
  verifyAbhaOtp,
} from "../controllers/abhaController.js";

const router = express.Router();

router.post("/generate-otp", protect, startAbhaEnrollment);
router.post("/verify-otp", protect, verifyAbhaOtp);

export default router;
