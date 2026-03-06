import express from "express";
import { signup, login, refreshToken, deleteAccount } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/refresh", refreshToken);

// Protected: Delete account
router.delete("/me", protect, deleteAccount);

export default router;
