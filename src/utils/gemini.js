import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_NAME = "gemini-2.5-flash";

/**
 * Helper to clean and parse JSON from Gemini's response
 */
const parseGeminiJson = (text) => {
  try {
    const cleanText = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Failed to parse Gemini JSON:", e);
    return null;
  }
};

/**
 * 1. Chat with the Digital Twin
 * (Logic extracted from your Express handler for use in a service layer)
 */
export const getTwinChatResponse = async (
  message,
  profile,
  vitals,
  reports,
) => {
  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = `
      You are the 'Digital Twin' AI for ${profile.name} (${profile.relation}).
      
      CONTEXT DATA:
      - Recent Vitals: ${JSON.stringify(vitals.map((v) => ({ type: v.readingType, val: v.value, unit: v.unit })))}
      - Medical History: ${reports.map((r) => r.aiAnalysis?.summary).join(" | ")}
      
      USER MESSAGE: "${message}"

      TASK:
      Answer the user's question based strictly on their data. 
      - If they ask for facts, use the Context Data.
      - If they ask for medical advice, provide biological reasoning based on their Twin's state but add a medical disclaimer.
      - Keep it brief (max 3 sentences). 
      - Use a supportive, personal tone.
    `;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("🤖 Twin Chat Error:", error);
    throw new Error("I'm having trouble connecting to your cloud brain.");
  }
};

/**
 * 2. Analyzes medical images (Lab Reports/Scans)
 */
export const analyzeMedicalImage = async (base64Data, isPdf = false) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 🚨 THE FIX: Set correct mimeType for PDF vs Image
    const mimeType = isPdf ? "application/pdf" : "image/jpeg";

    const prompt = `
      CONTEXT: Clinical data extraction for a Digital Twin app.
      STRICT PRIVACY: IGNORE Patient Name, Phone, Email, or Address.
      
      TASK: 
      1. Extract all lab parameters (Name, Value, Unit, Range).
      2. If PDF has multiple pages, scan all of them.
3. Provide a 2-sentence summary using simple, non-medical language that a child could understand.
      4. List 'Detected Issues' and 2 'Doctor Suggestions'.

      OUTPUT: Return ONLY JSON:
      {
        "summary": "string",
        "detectedIssues": ["string"],
        "doctorSuggestions": ["string"],
        "isCritical": boolean,
        "parameters": [{"name": "string", "value": "string", "unit": "string", "range": "string"}]
      }
    `;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType } },
    ]);

    const response = await result.response;
    return JSON.parse(
      response
        .text()
        .replace(/```json|```/g, "")
        .trim(),
    );
  } catch (error) {
    console.error("🤖 Gemini AI Error:", error);
    return null;
  }
};
/**
 * 3. Generates a holistic health briefing
 */
export const generateHealthBriefing = async (data) => {
  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = `
      ACT: You are the 'Digital Twin' AI for a premium health platform.
      USER CONTEXT:
      - Profile: ${data.profile.relation} (Age: ${data.profile.age})
      - Recent Vitals: ${JSON.stringify(data.vitals)}
      - Current Symptoms: ${data.symptoms}
      
      🚨 MEDICAL HISTORY (Last 5 Reports):
      ${JSON.stringify(data.history)}

      TASK:
      1. Review the "Medical History" of the 5 reports. Identify if any condition is recurring, improving, or worsening.
      2. Compare the "Recent Vitals" (like Heart Rate) to the findings in those reports.
      3. Provide a "Daily Briefing" (max 2 sentences) that connects today's vitals to the 5-report history.
      4. Provide a "7-Day Prediction" based on the trajectory of the data.
      5. Provide a "Health Tip" specifically related to the historical findings.

      STRICT RULES:
      - Stay professional yet encouraging.
      - Do NOT mention lab names or doctor names.

      OUTPUT FORMAT: Return ONLY JSON.
      {
        "briefing": "string",
        "prediction": "string",
        "tip": "string",
        "severity": "neutral | positive | warning"
      }
    `;

    const result = await model.generateContent(prompt);
    return parseGeminiJson(result.response.text());
  } catch (error) {
    console.error("🤖 Briefing Error:", error);
    return null;
  }
};
