import mongoose from "mongoose";

const medicalRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    localId: { type: String, required: true, unique: true }, // WatermelonDB UUID
    profileId: { type: String, required: true },
    title: { type: String, required: true },
    recordType: { type: String },
    imageUri: { type: String },

    // Data found by the phone's local OCR
    localExtractedData: { type: String },
    cloudinaryId: { type: String },

    // 🧠 AI Intelligence from Gemini
    aiAnalysis: {
      summary: String,
      detectedIssues: [String],
      doctorSuggestions: [String],
      isCritical: { type: Boolean, default: false },
    },

    recordDate: { type: Date, required: true },
  },
  { timestamps: true },
);

medicalRecordSchema.index({ userId: 1, profileId: 1 });

export default mongoose.model("MedicalRecord", medicalRecordSchema);
