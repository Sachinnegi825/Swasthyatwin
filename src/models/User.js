import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String },
  },
  { timestamps: true },
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  try {
    this.password = await bcrypt.hash(this.password, 10);
  } catch (err) {
    throw new Error(err);
  }
});

export default mongoose.model("User", userSchema);
