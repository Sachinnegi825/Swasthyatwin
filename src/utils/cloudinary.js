import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Returns { secure_url, public_id }
 */
export const uploadImage = async (base64String) => {
  try {
    const uploadRes = await cloudinary.uploader.upload(
      `data:image/jpeg;base64,${base64String}`,
      { folder: "swasthyatwin_reports" },
    );
    return {
      url: uploadRes.secure_url,
      publicId: uploadRes.public_id,
    };
  } catch (error) {
    console.error("❌ Cloudinary Upload Error:", error);
    return null;
  }
};

/**
 * Deletes a file from Cloudinary using its Public ID
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId);
    console.log("✅ Cloudinary Asset Deleted:", publicId);
  } catch (error) {
    console.error("❌ Cloudinary Delete Error:", error);
  }
};
