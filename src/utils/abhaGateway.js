import axios from "axios";
import forge from "node-forge";
import { v4 as uuidv4 } from "uuid";

const GATEWAY_URL = "https://dev.abdm.gov.in/gateway";
export const ABHA_URL = "https://abhasbx.abdm.gov.in/abha/api/v3";

/**
 * Encrypts data using NHA Public Key
 */
/**
 * Encrypts data using NHA Public Key (Updated to PKCS#1 v1.5)
 */
/**
 * Encrypts data using NHA Public Key (Strict V3 Standard)
 */
const encryptData = (data, publicKeyPem) => {
  const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);

  // 1. Convert JavaScript's UTF-16 string into standard UTF-8 bytes
  const utf8Data = forge.util.encodeUtf8(data);

  // 2. Encrypt using RSA-OAEP with SHA-1 (ABDM V3 spec)
  const encrypted = publicKey.encrypt(utf8Data, "RSA-OAEP", {
    md: forge.md.sha1.create(), // CHANGED: SHA-1 for digest
    mgf1: { md: forge.md.sha1.create() }, // CHANGED: SHA-1 for MGF1
  });

  return forge.util.encode64(encrypted);
};

/**
 * Reusable function to generate mandatory V3 Headers
 */
export const getStandardHeaders = (token) => {
  return {
    Authorization: `Bearer ${token}`,
    "X-CM-ID": "sbx",
    "REQUEST-ID": uuidv4(), // Must be a valid UUID
    TIMESTAMP: new Date().toISOString(), // Must be ISO string
    "Content-Type": "application/json",
  };
};

/**
 * Get Gateway Access Token
 */
export const getGatewayToken = async () => {
  try {
    const response = await axios.post(`${GATEWAY_URL}/v0.5/sessions`, {
      clientId: process.env.ABDM_CLIENT_ID,
      clientSecret: process.env.ABDM_CLIENT_SECRET,
    });
    return response.data.accessToken;
  } catch (error) {
    console.error("❌ ABDM Gateway Auth Failed");
    throw new Error("Government Gateway Authentication Failed");
  }
};

/**
 * Cleans up the NHA Public Key so node-forge can read it
 */
const sanitizePublicKey = (keyStr) => {
  // 1. Remove surrounding quotes if they exist
  let cleanKey = keyStr.replace(/^"|"$/g, "");

  // 2. Convert escaped '\n' characters into actual line breaks
  cleanKey = cleanKey.replace(/\\n/g, "\n");

  // 3. If the government server forgot the PEM headers, add them manually
  if (!cleanKey.includes("-----BEGIN PUBLIC KEY-----")) {
    cleanKey = `-----BEGIN PUBLIC KEY-----\n${cleanKey}\n-----END PUBLIC KEY-----`;
  }

  return cleanKey;
};

/**
 * Gets the Public Key from NHA for encryption
 */
const getPublicKey = async (token) => {
  try {
    const headers = getStandardHeaders(token);
    const CERT_URL =
      "https://abhasbx.abdm.gov.in/abha/api/v3/profile/public/certificate";

    console.log("Fetching Public Key from:", CERT_URL);
    const res = await axios.get(CERT_URL, { headers });

    // Extract the raw key string
    const rawKey =
      typeof res.data === "string" ? res.data : res.data.publicKey || res.data;

    // Clean it up!
    const validPem = sanitizePublicKey(rawKey);

    console.log("✅ Public Key Fetched and Sanitized Successfully");
    return validPem;
  } catch (error) {
    console.error(
      "❌ Failed to fetch Public Key. API Error:",
      error.response?.data || error.message,
    );
    throw new Error("Could not fetch NHA encryption certificate");
  }
};

/**
 * Step 1: Generate OTP for Aadhaar
 */
export const generateAadhaarOtp = async (aadhaarNumber) => {
  const token = await getGatewayToken();
  const publicKey = await getPublicKey(token);

  const encryptedAadhaar = encryptData(aadhaarNumber, publicKey);
  const headers = getStandardHeaders(token);

  console.log("Generating ABHA OTP for Aadhaar:", aadhaarNumber);
  console.log("Encrypted Aadhaar:", encryptedAadhaar);
  console.log("Request Headers:", headers);
  console.log("Request Payload:", {
    scope: ["abha-enrol"],
    loginHint: "aadhaar",
    loginId: encryptedAadhaar,
  });

  // The Exact Payload from the Docs
  // The Exact Payload from the Docs (fixed)
  const payload = {
    scope: ["abha-enrol"],
    loginHint: "aadhaar",
    loginId: encryptedAadhaar,
    otpSystem: "aadhaar", // REQUIRED for V3 Aadhaar OTP
  };

  try {
    const res = await axios.post(
      `${ABHA_URL}/enrollment/request/otp`,
      payload,
      { headers },
    );

    console.log("ABHA OTP Generation Response:", res.data);
    return res.data.txnId;
  } catch (error) {
    // Better error logging to see what exactly Kong/Gateway is complaining about
    console.error("API Error Response:", error.response?.data);
    throw error;
  }
};

/**
 * Step 2: Verify OTP and Enrol
 */
/**
 * Step 2: Verify OTP and Enrol (COMPLETE V3 PAYLOAD)
 */
export const verifyAndEnrol = async (txnId, otp, primaryMobile) => {
  // Add primaryMobile param
  const token = await getGatewayToken();
  const publicKey = await getPublicKey(token);

  const encryptedOtp = encryptData(otp, publicKey); // Same SHA-1 encrypt func
  const headers = getStandardHeaders(token);

  // FULL V3 REQUIRED PAYLOAD
  const payload = {
    authData: {
      authMethods: ["otp"],
      otp: {
        txnId: txnId,
        otpValue: encryptedOtp,
        mobile: primaryMobile, // User's primary mobile for ABHA
      },
    },
    consent: {
      code: "abha-enrollment",
      version: "1.4",
    },
  };

  console.log("Verify Payload:", JSON.stringify(payload, null, 2));

  try {
    const res = await axios.post(
      `${ABHA_URL}/enrollment/enrol/byAadhaar`,
      payload,
      { headers },
    );
    return res.data;
  } catch (error) {
    console.error("API Error Response:", error.response?.data);
    throw error;
  }
};
