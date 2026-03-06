import express from "express";
import {
  getHealthBriefing,
  handleTwinChat,
} from "../controllers/aiController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/briefing/:profileId", protect, getHealthBriefing);
router.post("/chat", protect, handleTwinChat);

export default router;
