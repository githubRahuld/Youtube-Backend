import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const refreshToken = user.generateRefreshToken();
    const accessToken = await User.generateAccessToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    //validateBeforeSave:false = jisse validation check na ho kyouki we didnt give all fields here

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access tokens"
    );
  }
};

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

  //   if (fullName === "") {
  //     throw new ApiError(400, "Fullname is required");
  //   }

  if (
    // it check all field one by one and check ,if that field exists ,if true then check after trimming it is empty or not ,if it is empty then return true
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All field are required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }], // check if anyone exists
  });

  if (existedUser) {
    //validate user already present or not
    throw new ApiError(409, "User with email or username already exists");
  }

  // get files path form multer/server

  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0].path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

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

const loginUser = asyncHandler(async (req, res) => {
  // get User Details
  // check field username ,password
  // find the user
  // password check
  // access and refresh token
  // send cookie

  const { email, password, username } = req.body;

  if (!username || !email) {
    throw new ApiError(400, "Username or Email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(400, "User not exists");
  }

  const isPassValid = await User.isPasswordCorrect(password);

  if (!isPassValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const { refreshToken, accessToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // so that cookies can't be modified at frontend
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("resfreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User successfully logged In"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // user ko access krke or usme se refresh token ko delete kr dena hai jisse user logout ho jaye
  // how to access user
  //we created middleware verifyJWT which finds user
  // In verifyJWT method we add user in req
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        // update in database
        refreshToken: undefined,
      },
    },
    {
      new: true, // so that we get updated values
    }
  );

  // now remove from cache

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out"));
});

export { registerUser, loginUser, logoutUser };
