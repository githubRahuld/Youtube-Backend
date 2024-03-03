import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
  {
    username: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
      required: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      required: true,
    },
    fullName: {
      type: String,
      lowercase: true,
      trim: true,
      required: true,
      index: true,
    },
    avatar: {
      type: String, // cloudnary url
      required: true,
    },
    coverImage: {
      type: String, // cloudnary url
      required: true,
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

// hook to encrypt password
// "pre" is middleware which check password before saving it
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); // if user not modified passward then return

  this.password = bcrypt.hash(this.password, 10); //else
  next();
});

//custom methods to check the password
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password); //return true or false
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id, // this._id came from database
      email: this.email, // this.username came from database
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const User = mongoose.model("User", userSchema);
