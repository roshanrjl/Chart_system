import fs from "fs";
import mongoose from "mongoose";
import { ApiError } from "./ApiError.js";
import path from "path";

const removeLocalFile = (localpath) => {
  const absolutePath = path.resolve(localpath);
  if (!fs.existsSync(absolutePath)) {
    console.error("❌ File doesn't exist:", absolutePath);
  } else {
    fs.unlink(absolutePath, (error) => {
      if (error) {
        throw new ApiError(
          400,
          "something went wrong while deleting the localfile path"
        );
      } else {
        console.log("file removed");
      }
    });
  }
};

export const getStaticFilePath = (req, fileName) => {
  return `${req.protocol}://${req.get("host")}/images/${fileName}`;
};

export const getLocalPath = (fileName) => {
  return `public/images/${fileName}`;
};

export { removeLocalFile };
