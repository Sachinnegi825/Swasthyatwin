import axios from "axios";
import Profile from "../models/Profile.js";
import {
  ABHA_URL,
  generateAadhaarOtp,
  getGatewayToken,
  getStandardHeaders,
  verifyAndEnrol,
} from "../utils/abhaGateway.js";

/**
 * Triggered when user enters Aadhaar number on phone
 */
export const startAbhaEnrollment = async (req, res) => {
  try {
    const { aadhaarNumber } = req.body;
    console.log("Received Aadhaar Number:", aadhaarNumber);

    if (!aadhaarNumber || aadhaarNumber.length !== 12) {
      return res
        .status(400)
        .json({ message: "Invalid 12-digit Aadhaar number" });
    }

    const txnId = await generateAadhaarOtp(aadhaarNumber);

    console.log("Generated ABHA OTP, txnId:", txnId);
    res
      .status(200)
      .json({ txnId, message: "OTP sent to your Aadhaar-linked mobile" });
  } catch (error) {
    console.error("ABHA OTP Error:", error.response?.data || error.message);
    res
      .status(500)
      .json({ message: "Govt server rejected the Aadhaar number" });
  }
};

/**
 * Triggered when user enters the 6-digit OTP
 */
export const verifyAbhaOtp = async (req, res) => {
  try {
    const { txnId, otp, profileId, primaryMobile } = req.body;
    const userId = req.user;
    console.log("🔍 Starting verify:", { txnId, profileId, primaryMobile });

    // ─── Step 1: Enroll ───────────────────────────────────────────────────────
    const enrollResponse = await verifyAndEnrol(txnId, otp, primaryMobile);
    console.log("✅ Enroll OK:", {
      message: enrollResponse.message,
      isNew: enrollResponse.isNew,
    });

    // ─── Step 2: Extract profile directly from enrollment response ────────────
    // No separate /profile call needed — ABHAProfile is already in the response
    const abhaProfile = enrollResponse.ABHAProfile;

    if (!abhaProfile) {
      console.error("❌ ABHAProfile missing in enrollment response");
      return res
        .status(500)
        .json({ message: "ABHA profile data not returned by server" });
    }

    // ─── Step 3: Map data ─────────────────────────────────────────────────────
    const abhaNumber = abhaProfile.ABHANumber;
    const abhaAddress =
      abhaProfile.phrAddress?.[0] ?? abhaProfile.preferredAddress;

    console.log("🔍 Mapped:", { abhaNumber, abhaAddress });

    // ─── Step 4: Persist tokens alongside profile (optional but useful) ───────
    const userToken = enrollResponse.tokens?.token;
    const refreshToken = enrollResponse.tokens?.refreshToken;

    // ─── Step 5: Update MongoDB ───────────────────────────────────────────────
    const updatedProfile = await Profile.findOneAndUpdate(
      { localId: profileId, userId },
      {
        abhaNumber,
        abhaAddress,
        isAbhaVerified: true,
        abhaDetails: {
          gender: abhaProfile.gender,
          dob: abhaProfile.dob,
          profilePhoto: abhaProfile.photo,
        },
        // Store tokens so you can call user-scoped APIs later if needed
        ...(userToken && {
          abhaToken: userToken,
          abhaRefreshToken: refreshToken,
        }),
      },
      { new: true },
    );

    if (!updatedProfile) {
      console.error("❌ Profile not found in DB:", { profileId, userId });
      return res.status(404).json({ message: "Profile not found" });
    }

    console.log("✅ MongoDB OK:", updatedProfile.abhaNumber);

    // ─── Step 6: Respond ──────────────────────────────────────────────────────
    return res.status(200).json({
      message: "ABHA Identity Linked Successfully",
    });
  } catch (error) {
    console.error("❌ ERROR at:", error.message);
    console.error("❌ Full error:", error.response?.data || error);
    return res.status(500).json({ message: "Invalid OTP or Session Expired" });
  }
};
