import User from "../models/User.js";
import Profile from "../models/Profile.js";
import HealthReading from "../models/HealthReading.js";
import Medication from "../models/Medication.js";
import MedicalRecord from "../models/MedicalRecord.js";
import ShareToken from "../models/ShareToken.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const generateTokens = (id) => {
  const accessToken = jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "2d",
  });
  const refreshToken = jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "17d",
  });
  return { accessToken, refreshToken };
};

export const signup = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    console.log("Signup attempt:", email);

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const user = await User.create({ email, password, name });
    const tokens = generateTokens(user._id);

    // Ensure BOTH tokens are sent back
    res.status(201).json({
      user: { id: user._id, email: user.email, name: user.name },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const tokens = generateTokens(user._id);
    console.log("Login successful for:", tokens);

    res.json({ user: { id: user._id, email, name: user.name }, ...tokens });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(403).json({ message: "Refresh token required" });

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // ROTATION: Issue a NEW access token AND a NEW refresh token
    const tokens = generateTokens(payload.id);

    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err) {
    res.status(403).json({ message: "Invalid refresh token" });
  }
};

/**
 * DELETE: Wipe All User Data
 */
export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user;

    // 1. Delete all associated data
    await Promise.all([
      HealthReading.deleteMany({ userId }),
      Medication.deleteMany({ userId }),
      MedicalRecord.deleteMany({ userId }),
      Profile.deleteMany({ userId }),
      ShareToken.deleteMany({ userId }),
    ]);

    // 2. Delete the User record
    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error("Account Deletion Error:", err);
    res.status(500).json({ message: "Server Error during account deletion" });
  }
};
