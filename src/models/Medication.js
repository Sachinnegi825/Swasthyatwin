import mongoose from "mongoose";

const medicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    localId: {
      type: String,
      required: true,
      unique: true, // WatermelonDB UUID
    },
    profileId: {
      type: String,
      required: true,
    },
    name: { type: String, required: true },
    dose: { type: String },
    frequency: { type: String, default: "Daily" },
    reminderTimes: {
      type: [String], // Array of strings like ["08:00", "20:00"]
      default: [],
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null, // null means "Ongoing"
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Index for fast profile-based searching
medicationSchema.index({ userId: 1, profileId: 1 });

export default mongoose.model("Medication", medicationSchema);
