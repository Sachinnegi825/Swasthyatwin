import HealthReading from "../models/HealthReading.js";
import Profile from "../models/Profile.js";
import Medication from "../models/Medication.js";
import MedicalRecord from "../models/MedicalRecord.js";
import { analyzeMedicalImage } from "../utils/gemini.js";
import { deleteFromCloudinary, uploadImage } from "../utils/cloudinary.js";

/**
 * PUSH: Sync Health Readings
 */
export const syncHealthData = async (req, res) => {
  try {
    const { readings } = req.body;
    const userId = req.user;

    const operations = readings.map((r) => ({
      updateOne: {
        filter: { localId: r.id, userId },
        update: {
          ...r,
          userId,
          readingType: r.type,
          timestamp: new Date(r.timestamp),
          notes: r.notes, // 👈 CRITICAL: Ensure notes (timeSlot) is saved
        },
        upsert: true,
      },
    }));

    await HealthReading.bulkWrite(operations);
    res.status(200).json({ syncedIds: readings.map((r) => r.id) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUSH: Sync Family Profiles
 */

export const syncProfiles = async (req, res) => {
  try {
    const { profiles } = req.body;
    const userId = req.user;

    const existingProfiles = await Profile.find({ userId });

    const operations = profiles.map((p) => {
      let filter = { localId: p.id, userId };
      if (p.relation === "Self") {
        filter = { userId, relation: "Self" };
      }

      // 2. Find this specific profile in the database
      const existingProfile = existingProfiles.find((ep) =>
        p.relation === "Self" ? ep.relation === "Self" : ep.localId === p.id,
      );

      // 3. Always update basic info
      const updateData = {
        name: p.name,
        age: p.age,
        relation: p.relation,
        userId,
        localId: p.id,
      };

      if (p.avatar !== undefined) updateData.avatar = p.avatar;

      // 🚨 CORE FIX: Check if ABHA is already verified in the backend
      if (existingProfile && existingProfile.isAbhaVerified === true) {
        // DO NOTHING: The backend has verified ABHA data.
        // We will NOT add abhaNumber/abhaAddress to updateData, preventing overwrites.
      } else {
        // OVERWRITE: It's not verified, so it's safe to overwrite
        if (p.abhaNumber !== undefined) updateData.abhaNumber = p.abhaNumber;
        if (p.abhaAddress !== undefined) updateData.abhaAddress = p.abhaAddress;
      }

      return {
        updateOne: {
          filter,
          update: { $set: updateData },
          upsert: true,
        },
      };
    });

    // 4. Run the safe bulk update
    await Profile.bulkWrite(operations);

    // 5. Fetch the fresh data from DB (with the protected ABHA data intact)
    const backendProfiles = await Profile.find({ userId });

    // 6. Send it back so the frontend can pull down the ABHA data!
    const mappedProfiles = backendProfiles.map((p) => ({
      id: p.localId,
      name: p.name,
      age: p.age,
      relation: p.relation,
      abhaNumber: p.abhaNumber,
      abhaAddress: p.abhaAddress,
      avatar: p.avatar,
      isAbhaVerified: p.isAbhaVerified,
    }));

    res.status(200).json({
      message: "Profiles Synced",
      syncedIds: profiles.map((p) => p.id),
      profiles: mappedProfiles,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUSH: Sync Medications (Now with Course Dates)
 */
export const syncMedications = async (req, res) => {
  try {
    const { medications } = req.body;
    const userId = req.user;

    const operations = medications.map((m) => {
      let times = m.reminderTimes;
      if (typeof times === "string") {
        try {
          times = JSON.parse(times);
        } catch (e) {
          times = [times];
        }
      }

      return {
        updateOne: {
          filter: { localId: m.id, userId },
          update: {
            ...m,
            userId,
            localId: m.id,
            reminderTimes: Array.isArray(times) ? times : [times],
            // Ensure Dates are handled correctly
            startDate: new Date(m.startDate),
            endDate: m.endDate ? new Date(m.endDate) : null,
          },
          upsert: true,
        },
      };
    });

    await Medication.bulkWrite(operations);
    res.status(200).json({
      message: "Meds Synced",
      syncedIds: medications.map((m) => m.id),
    });
  } catch (error) {
    console.error("Med Sync Error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUSH: Sync Medical Records & Trigger Gemini AI Analysis
 */
export const syncMedicalRecords = async (req, res) => {
  try {
    const { records, deletedIds } = req.body;
    const userId = req.user;
    const updatedRecords = [];

    if (deletedIds && deletedIds.length > 0) {
      for (const localId of deletedIds) {
        const recordToDelete = await MedicalRecord.findOne({ localId, userId });
        if (recordToDelete) {
          if (recordToDelete.cloudinaryId) {
            await deleteFromCloudinary(recordToDelete.cloudinaryId);
          }
          // Remove from MongoDB
          await MedicalRecord.deleteOne({ localId, userId });
        }
      }
    }

    for (const rec of records) {
      const isPdf =
        rec.recordType === "PDF" || rec.imageUri.toLowerCase().endsWith(".pdf");

      let cloudUrl = rec.imageUri;
      let cloudinaryId = null;

      if (rec.imageBase64) {
        const uploadRes = await uploadImage(rec.imageBase64);
        if (uploadRes) {
          cloudUrl = uploadRes.url;
          cloudinaryId = uploadRes.publicId;
        }
      }

      // Analyze via AI
      const aiResult = await analyzeMedicalImage(rec.imageBase64, isPdf);

      const savedDoc = await MedicalRecord.findOneAndUpdate(
        { localId: rec.id, userId },
        {
          userId,
          localId: rec.id,
          profileId: rec.profileId,
          title: rec.title,
          recordType: isPdf ? "PDF Document" : "Lab Report",
          imageUri: cloudUrl,
          cloudinaryId: cloudinaryId,
          localExtractedData: rec.extractedData,
          aiAnalysis: aiResult,
          recordDate: new Date(rec.recordDate),
        },
        { upsert: true, new: true },
      );

      updatedRecords.push({
        id: savedDoc.localId,
        imageUri: savedDoc.imageUri,
        aiAnalysis: savedDoc.aiAnalysis,
      });
    }

    res.status(200).json({
      message: "Sync Complete",
      records: updatedRecords,
      deletedCount: deletedIds?.length || 0,
    });
  } catch (error) {
    console.error("Sync Medical Records Error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * PULL: Restore All Data
 */
export const restoreData = async (req, res) => {
  try {
    const userId = req.user;
    const [profiles, readings, medications, records] = await Promise.all([
      Profile.find({ userId }),
      HealthReading.find({ userId }),
      Medication.find({ userId }),
      MedicalRecord.find({ userId }),
    ]);

    const profileMap = {};
    profiles.forEach((p) => {
      profileMap[p.localId] = p.relation;
    });

    console.log("profiles:", profiles);

    res.status(200).json({
      profiles: profiles.map((p) => ({
        id: p.localId,
        name: p.name,
        age: p.age,
        relation: p.relation,
        medicalInfo: p.medicalInfo,
        abhaNumber: p.abhaNumber,
        abhaAddress: p.abhaAddress,
      })),
      readings: readings.map((r) => ({
        id: r.localId,
        type: r.readingType,
        value: r.value,
        unit: r.unit,
        notes: r.notes,
        timestamp: new Date(r.timestamp).getTime(),
        profileId: r.profileId,
      })),
      medications: medications.map((m) => ({
        id: m.localId,
        profileId: m.profileId,
        name: m.name,
        dose: m.dose,
        frequency: m.frequency,
        reminderTimes: JSON.stringify(m.reminderTimes),
        startDate: new Date(m.startDate).getTime(),
        endDate: m.endDate ? new Date(m.endDate).getTime() : null,
        isActive: m.isActive,
      })),
      records: records.map((rec) => ({
        id: rec.localId,
        profileId: rec.profileId,
        relation: profileMap[rec.profileId] || "Member",
        title: rec.title,
        recordType: rec.recordType,
        imageUri: rec.imageUri,
        extractedData: rec.localExtractedData,
        aiAnalysis: rec.aiAnalysis,
        recordDate: new Date(rec.recordDate).getTime(),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
