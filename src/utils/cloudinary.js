import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    //upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    //file has been uploaded successfully
    // console.log("File is uploaded on cloudinary", response.url);

    // delete file from server
    fs.unlinkSync(localFilePath);

    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // remove the locally saved temporary file as the upload operation got failed
    return null;
  }
};

const deleteOnCloudinary = async (localFilePath) => {
  try {
    // Ensure that the publicId is provided
    if (!localFilePath) {
      throw new Error(
        "Local file path is required for deleting a file from Cloudinary"
      );
    }

    // Delete the file from Cloudinary
    const deletionResponse = await cloudinary.uploader.destroy(localFilePath);

    // Log success message or handle response
    console.log("File deleted successfully from Cloudinary", deletionResponse);

    return deletionResponse;
  } catch (error) {
    // Handle errors
    console.error("Error deleting file from Cloudinary:", error.message);
    throw error; // Re-throw the error for handling in the calling function
  }
};

export { uploadOnCloudinary, deleteOnCloudinary };
