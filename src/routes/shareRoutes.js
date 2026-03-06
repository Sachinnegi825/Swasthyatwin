import express from "express";
import {
  createShareLink,
  exportClinicalPDF,
  viewSharedReport,
} from "../controllers/shareController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// The Mobile App calls this (Needs Login)
router.post("/create", protect, createShareLink);

// The Doctor scans this (Public - No Login)
router.get("/view/:token", viewSharedReport);

router.post("/export-pdf", protect, exportClinicalPDF);

export default router;
