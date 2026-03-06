import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  restoreData,
  syncHealthData,
  syncMedicalRecords,
  syncMedications,
  syncProfiles,
} from "../controllers/syncController.js";

const router = express.Router();

router.post("/health-data", protect, syncHealthData);
router.post("/profiles", protect, syncProfiles);
router.post("/medications", protect, syncMedications);
router.get("/restore", protect, restoreData);
router.post("/medical-records", protect, syncMedicalRecords);

export default router;
