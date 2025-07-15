import {v2 as cloudinary} from "cloudinary"
import { error } from "console";
import { response } from "express";
import fs, { appendFile } from "fs"
import { removeLocalFile } from "./helper.js";


cloudinary.config({
    cloud_name:process.env.CLOUD_NAME,
    api_key:process.env.CLOUD_API_KEY,
    api_secret:process.env.CLOUD_API_SECRET
});

const uploadOnCloudinary = async(localfilepath)=>{
  console.log(localfilepath)
  if(!localfilepath) return null;

  try{
    const response=  await cloudinary.uploader.upload(localfilepath,{
      resource_type:"auto"
    })
    return response;

  }catch(error){
  fs.unlinkSync(localfilepath)
  console.error("cloudinary upload failed",error.message);
   return null;
  }
}



 const deleteFromCloudinary = async (public_id) => {
  try {
    const result = await cloudinary.uploader.destroy(public_id);

    if (result.result !== "ok" && result.result !== "not found") {
      throw new Error(`Cloudinary deletion failed: ${result.result}`);
    }

    console.log("Deleted from Cloudinary:", public_id);
    return result;
  } catch (error) {
    console.error("Cloudinary delete error:", error.message || error);
    throw new Error("Failed to delete image from Cloudinary");
  }
};


export {uploadOnCloudinary,deleteFromCloudinary}