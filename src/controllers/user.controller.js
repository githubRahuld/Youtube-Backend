import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validate - fields not empty
  // check if user already exists: username ,email
  // check for images,check for avatar
  // upload them on claudinary, avatar
  // create user object - create entry in db
  // remove password and refresh token field from response
  // check for user creation
  // return response

  const { fullName, email, username, password } = req.body;
  console.log(email);

  //   if (fullName === "") {
  //     throw new ApiError(400, "Fullname is required");
  //   }

  if (
    // it check all field one by one and check ,if that field exists ,if true then check after trimming it is empty or not ,if it is empty then return true
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All field are required");
  }

  const existedUser = User.findOne({
    $or: [{ username }, { email }], // check if anyone exists
  });

  if (existedUser) {
    //validate user already present or not
    throw new ApiError(409, "User with email or username already exists");
  }

  // get files form multer/server
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0].path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar Image is required");
  }

  // upload on cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  // check if avatar is uploaded or not
  if (!avatar) {
    throw new ApiError(400, "Avatar Image is required");
  }

  const user = await User.create({
    fullName,
    username: username.toLowerCase(),
    email,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  // if user created then remove some fields
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //if user not create throw err
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering user!");
  }

  // give success response
  res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered Successfully :)"));
});

export { registerUser };
