import mongoose from "mongoose";

const shareTokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true },
    profileId: { type: String, required: true }, // Local WatermelonDB ID
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// Auto-delete from MongoDB after expiry
shareTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("ShareToken", shareTokenSchema);
