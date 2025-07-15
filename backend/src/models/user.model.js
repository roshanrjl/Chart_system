import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"
import { AvailableUserRoles, UserRolesEnum} from "../constants.js";



const userSchema = new Schema(
  {
    username: {
      type: String,
      requried: true,
      unique: true,
    },
    email: {
      type: String,
      requried: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "password is required"],
    },
    profileImage: {
      type: String,
    },
    refreshToken: {
      type: String,
    },
    role: {
      type: String,
      enum: AvailableUserRoles,
      default: UserRolesEnum.USER,
      required: true,
    },
  },

  { timestamps: true }
);
//hashing the password before saving it into the database
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});
//comparing the password for if the password provided by user is correct or not 
userSchema.methods.ispasswordCorrect = async function (password) {
    return await bcrypt.compare(password , this.password)
    
}

//creating the accesstoken
userSchema.methods.generateAccessToken = function(){
    return jwt.sign({
        _id: this._id,
        email:this.email,
        username:this.username
    },
    process.env.ACCESS_TOKEN_SECRET ,
{
    expiresIn:process.env.ACCESS_TOKEN_EXPIRES
})
}

//generating the refreshtoken
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign({
        _id: this._id,
        
    },
    process.env.REFRESH_TOKEN_SECRET ,
{
    expiresIn:process.env.REFRESH_TOKEN_EXPIRES
})
}

export const User = mongoose.model("User",userSchema)
