import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";

const verifyJwt = asyncHandler(async(req, res, next)=>{
   try{
     const token = req.cookies?.accessToken|| req.header("Authorization")?.replace("Bearer ", "");
    
    if(!token){
        throw new ApiError(400,"unauthorized access")
    }
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

    const user = await User.findById(decodedToken._id).select("-password -refreshToken")
    
    if(!user){
        throw new ApiError(400,"invalid token")
    }
    

    req.user= user
    next()

   }catch(error){
    throw new ApiError(400, "invalid token")
   }
})
//This middleware is responsible for validating multiple user role permissions at a time.
 //So, in future if we have a route which can be accessible by multiple roles, we can achieve that with this middleware
export const verifyPermission = (roles = []) =>
  asyncHandler(async (req, res, next) => {
    if (!req.user?._id) {
      throw new ApiError(401, "Unauthorized request");
    }
    if (roles.includes(req.user?.role)) {
      next();
    } else {
      throw new ApiError(403, "You are not allowed to perform this action");
    }
  });

export {verifyJwt}