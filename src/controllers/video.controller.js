import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.models.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { Video } from "../models/video.models.js";

const getAllVideos = asyncHandler(async (req, res) => {
  let { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination

  // query = cooking,dance etc
  // sortBy - title
  // sortType = asc/desc

  if (!userId) {
    throw new ApiError(400, "UserId is required");
  }

  // Parse page and limit to numbers
  page = parseInt(page, 10);
  limit = parseInt(limit, 10);

  // Validate and adjust page and limit values
  page = Math.max(1, page); // Ensure page is at least 1
  limit = Math.min(10, Math.max(1, limit)); // Ensure limit is between 1 and 20

  const pipline = [];

  if (userId) {
    await User.findById(userId);

    pipline.push({
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    });
  }
  console.log(query, typeof query);

  // match videos on the bases of search query
  // query part not working
  if (query) {
    pipline.push({
      $match: {
        isPublised: true,
      },
    });
  }

  //! incomplete
  let createFeiild = {};
  if (sortBy && sortType) {
    createFeiild[sortBy] = sortType === "asc" ? 1 : -1;

    pipline.push({
      $sort: createFeiild,
    });
  } else {
    createFeiild["createdAt"] = -1;

    pipline.push({
      $sort: createFeiild,
    });
  }

  pipline.push({
    $skip: (page - 1) * limit,
  });
  pipline.push({
    $limit: limit,
  });
  console.log(pipline);
  /*
  [
{ '$match': { owner: new ObjectId('65e0782461c4addc4efa7528') } },  
{ '$match': { isPublished: false } },
{ '$sort': { isPublished: 1 } },
{ '$skip': 0 },
{ '$limit': 10 }
] */

  const allVedios = await Video.aggregate(pipline);
  if (!allVedios) {
    throw new ApiError(400, "pipline aggreagtion problem");
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        allVedios,
        `all vedios are here count:${allVedios.length}`
      )
    );
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!(title || description)) {
    throw new ApiError(400, "title and description are required");
  }

  //   console.log("Video path info: ", req.files.videoFile);
  //   console.log("thumbnail path info: ", req.files.thumbnail);

  const videoLocalPath = req.files?.videoFile[0]?.path;
  console.log(videoLocalPath.url);
  const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

  if (!videoLocalPath) {
    throw new ApiError(400, "Video is required");
  }
  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Video thumbnail is required");
  }

  const video = await uploadOnCloudinary(videoLocalPath);

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  //   console.log("video info: ", video);

  const videoData = await Video.create({
    videoFile: video?.url,
    thumbnail: thumbnail?.url,
    owner: req.user?._id,
    title: title,
    description: description,
    duration: video.duration,
    views: 0,
    isPublished: true,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, videoData, "Video pulished successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  console.log(_id);

  if (!_id) {
    throw new ApiError(400, "Video Id is required");
  }

  const userVideo = await Video.findById(_id);
  console.log(userVideo);

  if (
    !userVideo ||
    (!userVideo.isPublished && !userVideo.owner === req.user._id)
  ) {
    throw new ApiError(400, "vedio ur seacrching for doesnot exist");
  }

  return res.status(200).json(200, userVideo, "Video fetched successefuly");
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail

  const myVideo = await Video.findById(videoId);

  if (!myVideo || !(myVideo.owner.toString() === req.user._id.toString())) {
    throw new ApiError(400, "Cannot find the vedio");
  }

  const { title, description } = req.body;

  if (!(title && description)) {
    throw new ApiError(400, "Invalid title and description");
  }

  const thumbnailLocalPath = await req.file?.path;
  const videoLocalPath = await req.file?.path;

  if (!(videoLocalPath && thumbnailLocalPath)) {
    throw new ApiError(400, "Please upload new video and thumbnail ");
  }

  const updatedVideo = await uploadOnCloudinary(videoLocalPath);
  const updatedThumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  const newVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title: title,
        description: description,
        videoFile: updatedVideo?.url,
        thumbnail: updatedThumbnail?.url,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, newVideo, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video

  if (!videoId) {
    throw new ApiError(400, "Cannot find the vedioid");
  }

  const deleteUserVideo = await Video.findById(videoId);

  if (
    !deleteUserVideo ||
    !(deleteUserVideo.owner.toString() === req.user._id.toString())
  ) {
    throw new ApiError(400, "Cannot find the vedio");
  }

  // delete file on cloudinary
  const deletedFile = await deleteOnCloudinary(deleteUserVideo.videoFile);

  // now delete from DB

  await Video.findByIdAndDelete(videoId);

  return res
    .status(200)
    .json(new ApiResponse(200, deletedFile, "Video Delete Successfull"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "video Id required");
  }

  const videoExists = await Video.findById(videoId);

  if (!videoExists) {
    throw new ApiError(400, "video Not exists");
  }

  if (!(videoExists.owner == req.user._id)) {
    throw new ApiError(400, "Not allowed to toggle");
  }

  videoExists.isPublished = !videoExists.isPublished;

  await videoExists.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(videoExists.isPublished, "toggled successfully"));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
