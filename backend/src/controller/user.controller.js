import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { removeLocalFile } from "../utils/helper.js";
import  client  from "../redis/client.js";

//constroller for generating refresh and accesstoken
const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating referesh and access token"
    );
  }
};

//controller for registering the user
const registerUser = asyncHandler(async (req, res) => {

  const { username, email, password } = req.body;
  

  if (!username) {
    throw new ApiError(400, "username didnot found");
  }
  if (!email) {
    throw new ApiError(400, "email didnot found");
  }
  if (!password) {
    throw new ApiError(400, "password didnot found");
  }

  const existduser = await User.findOne({ $or: [{ username }, { email }] });
  if (existduser) {
    throw new ApiError(
      409,
      "user already register please login with username and password"
    );
  }
  const coverImageFile = req.file?.path;


  if (!coverImageFile) {
    throw new ApiError(400, "profileImage didn't found");
  }

  const coverImage = await uploadOnCloudinary(coverImageFile);

  if (!coverImage) {
    throw new ApiError(
      500,
      "coverimage url from cloudinary didn't found internal error"
    );
  }

  const newuser = await User.create({
    username: username.toLowerCase(),
    email: email,
    profileImage: coverImage.url,
    password: password,
  });
 
  removeLocalFile(coverImageFile);

  const createdUser = await User.findById(newuser._id).select(
    "-password -refreshToken"
  );

  return res
    .status(200)
    .json(new ApiResponse(200, createdUser, "user regiter successfully"));
});

//contoller for login the user
const login = asyncHandler(async (req, res) => {
  const { username, password, email } = req.body;

  if (!username && !email) {
    throw new ApiError(400, "atlest email or username is required");
  }
  if (!password) {
    throw new ApiError(400, "password is required");
  }

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (!user) {
    throw new ApiError(
      400,
      "user with that username or email doesn't exit please registe first"
    );
  }

  const isPasswordValid = await user.ispasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(400, "invalid password try again");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  //storing the accessToken and refreshToken inside redis
  await client.set(`access:${user._id}`, accessToken, "EX", 60 * 15);
  await client.set(
    `refresh:${user._id}`,
    refreshToken,
    "EX",
    60 * 60 * 24 * 7
  );

const options = {
  httpOnly: true,
  secure:false ,
  sameSite:'lax'
};
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken
        },
        "User logged In Successfully"
      )
    );
});

//controller for logout the user
const logout = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    return res.status(401).json(new ApiResponse(401, {}, "Unauthorized"));
  }

  await User.findByIdAndUpdate(
    req.user._id,
    { $unset: { refreshToken: 1 } },
    { new: true }
  );
  await client.del(`access:${req.user._id}`);
  await client.del(`refresh:${req.user._id}`);

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});


//controller for getting the current user
const getCurrentUser = asyncHandler(async (req, res) => {
  const user = req.user._id;
  return res
    .status(200)
    .json(new ApiResponse(200, user, "current user get successfully"));
});

// controller for updating the accout detail
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { username } = req.body;

  if (!username) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        username,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

//controller for changing  password
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

//controller for changing the profileImage
const changeProfileImage = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const currentUser = await User.findById(req.user._id);

  if (!currentUser) {
    throw new ApiError(404, "User not found");
  }

  // Step 1: Delete old avatar from Cloudinary if it exists
  if (currentUser.avatarPublicId) {
    await deleteFromCloudinary(currentUser.avatarPublicId);
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading on avatar");
  }

  removeLocalFile(avatarLocalPath);

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar image updated successfully"));
});

//generating the refreshtoken
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    const userId = decodedToken?._id;

    if (!userId) {
      throw new ApiError(401, "Invalid refresh token");
    }

    // Check refresh token in Redis using your `client` instance
    const storedRefreshToken = await client.get(`refresh:${userId}`);

    if (!storedRefreshToken || incomingRefreshToken !== storedRefreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    // Generate new tokens (assuming this function returns { accessToken, refreshToken })
    const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefereshTokens(userId);

    // Save the new refresh token in Redis with expiration (7 days)
    await client.set(`refresh:${userId}`, newRefreshToken, "EX", 60 * 60 * 24 * 7);

    const options = { httpOnly: true, secure: true };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, "Access token refreshed"));
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});


export {
  registerUser,
  login,
  logout,
  getCurrentUser,
  updateAccountDetails,
  changeCurrentPassword,
  changeProfileImage,
  refreshAccessToken,
};
