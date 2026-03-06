import mongoose from "mongoose";

const profileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    localId: {
      type: String,
      required: true,
      unique: true, // This is the WatermelonDB UUID
    },
    name: { type: String, required: true },
    age: { type: Number },
    relation: { type: String },
    avatar: { type: String },
    abhaNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    abhaAddress: {
      type: String,
      unique: true,
      sparse: true,
    },
    isAbhaVerified: {
      type: Boolean,
      default: false,
    },
    abhaDetails: {
      gender: String,
      dob: String,
      profilePhoto: String,
    },

    // Emergency Medical ID (Nested)
    medicalInfo: {
      bloodType: { type: String, default: "--" },
      allergies: { type: [String], default: [] },
      conditions: { type: [String], default: [] },
      emergencyContacts: [
        {
          name: String,
          phone: String,
        },
      ],
    },
  },
  { timestamps: true },
);

// Index for fast searching by User
profileSchema.index({ userId: 1, localId: 1 });

export default mongoose.model("Profile", profileSchema);
