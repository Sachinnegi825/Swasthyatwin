import HealthReading from "../models/HealthReading.js";
import MedicalRecord from "../models/MedicalRecord.js";
import Profile from "../models/Profile.js";
import {
  generateHealthBriefing,
  getTwinChatResponse,
} from "../utils/gemini.js";

export const getHealthBriefing = async (req, res) => {
  try {
    const { profileId } = req.params;
    const userId = req.user;

    // 1. Fetch Profile Info
    const profile = await Profile.findOne({ localId: profileId, userId });
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    // 2. Fetch Latest 10 Vitals (for immediate context)
    const vitals = await HealthReading.find({ profileId, userId })
      .sort({ timestamp: -1 })
      .limit(10);

    // 3. 🚨 NEW: Fetch Last 5 Medical Reports for Historical Context
    const pastReports = await MedicalRecord.find({ profileId, userId })
      .sort({ recordDate: -1 })
      .limit(5);

    // 4. Extract latest symptoms
    const latestSymptomRecord = await HealthReading.findOne({
      profileId,
      userId,
      readingType: "symptoms",
    }).sort({ timestamp: -1 });

    // 5. Format the "Medical History" for Gemini
    // We send the summaries we already generated when the user first scanned the reports
    const reportHistory = pastReports.map((report, index) => ({
      date: report.recordDate,
      title: report.title,
      summary: report.aiAnalysis?.summary || "No summary available",
    }));

    // 6. Run the AI Brain
    const briefing = await generateHealthBriefing({
      profile,
      vitals: vitals.map((v) => ({
        type: v.readingType,
        value: v.value,
        date: v.timestamp,
      })),
      history: reportHistory,
      symptoms: latestSymptomRecord?.unit || "None",
    });

    res.status(200).json(briefing);
  } catch (error) {
    console.error("❌ AI Briefing Controller Error:", error);
    res.status(500).json({ message: "AI Engine is temporarily resting." });
  }
};

export const handleTwinChat = async (req, res) => {
  try {
    const { message, profileId } = req.body;
    const userId = req.user;

    // Fetch Context
    const [profile, vitals, reports] = await Promise.all([
      Profile.findOne({ localId: profileId, userId }),
      HealthReading.find({ profileId, userId })
        .sort({ timestamp: -1 })
        .limit(10),
      MedicalRecord.find({ profileId, userId })
        .sort({ recordDate: -1 })
        .limit(3),
    ]);

    const reply = await getTwinChatResponse(message, profile, vitals, reports);
    res.status(200).json({ reply });
  } catch (error) {
    res.status(500).json({
      reply:
        "I'm having trouble connecting to your cloud brain, but I'm still monitoring your vitals locally.",
    });
  }
};
