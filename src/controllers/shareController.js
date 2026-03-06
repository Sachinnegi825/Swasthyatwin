import crypto from "crypto";
import ShareToken from "../models/ShareToken.js";
import Profile from "../models/Profile.js";
import MedicalRecord from "../models/MedicalRecord.js";

import HealthReading from "../models/HealthReading.js";
import { generateHTMLReport } from "../utils/reportTemplate.js";
import { generatePDFBuffer } from "../utils/pdfGenerator.js";

/**
 * PUSH: Generate PDF for WhatsApp Sharing
 */
export const exportClinicalPDF = async (req, res) => {
  try {
    const { profileId } = req.body;
    const userId = req.user;

    // 1. Create a temporary high-security token (Valid for only 10 minutes for PDF generation)
    const token = crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await ShareToken.create({ token, profileId, userId, expiresAt });

    // 2. Construct the URL that Puppeteer will visit
    // Use the internal network URL (localhost) to make it faster
    const internalUrl = `${req.protocol}://${req.get("host")}/api/share/view/${token}`;

    console.log(`📑 Compiling PDF for Profile: ${profileId}`);

    // 3. Generate the PDF
    const buffer = await generatePDFBuffer(internalUrl);

    // 4. Send the PDF file back to the mobile app
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=HealthReport.pdf",
      "Content-Length": buffer.length,
    });

    res.status(200).send(buffer);
  } catch (error) {
    console.error("❌ PDF Export Failed:", error);
    res
      .status(500)
      .json({ message: "Failed to generate PDF", error: error.message });
  }
};

export const createShareLink = async (req, res) => {
  try {
    const { profileId } = req.body;
    const userId = req.user;

    // 1. Generate a secure unique token
    const token = crypto.randomBytes(16).toString("hex");

    // 2. Set expiry to 24 hours from now
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await ShareToken.create({ token, profileId, userId, expiresAt });

    // 3. Return the public URL
    const baseUrl =
      process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
    const shareUrl = `${baseUrl}/api/share/view/${token}`;
    res.status(201).json({ token, shareUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const viewSharedReport = async (req, res) => {
  try {
    const { token } = req.params;

    const share = await ShareToken.findOne({ token });
    if (!share)
      return res
        .status(404)
        .send(
          "<h1 style='text-align:center; margin-top:50px;'>Link Expired or Invalid</h1>",
        );

    const [profile, readings, records] = await Promise.all([
      Profile.findOne({ localId: share.profileId, userId: share.userId }),
      HealthReading.find({ profileId: share.profileId, userId: share.userId })
        .sort({ timestamp: -1 })
        .limit(30),
      MedicalRecord.find({ profileId: share.profileId, userId: share.userId })
        .sort({ recordDate: -1 })
        .limit(5),
    ]);

    if (!profile) return res.status(404).send("Profile Not Found");

    const htmlContent = generateHTMLReport({ profile, readings, records });
    res.send(htmlContent);
  } catch (error) {
    console.error("View Shared Report Error:", error);
    res.status(500).send("Internal Server Error");
  }
};
