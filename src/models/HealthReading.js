import mongoose from "mongoose";

const healthReadingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    profileId: { type: String, required: true }, // For family profiles
    readingType: { type: String, required: true }, // heart_rate, mood, etc.
    value: { type: Number, required: true },
    unit: { type: String },
    timestamp: { type: Date, required: true },
    localId: { type: String, required: true, unique: true }, // WatermelonDB ID
    notes: { type: String }, // For storing timeSlot or any additional info
  },
  { timestamps: true },
);

// Indexing for fast retrieval (for the AI Twin engine later)
healthReadingSchema.index({ userId: 1, timestamp: -1 });

export default mongoose.model("HealthReading", healthReadingSchema);
