import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet
  const { content } = req.body;
  console.log(content);

  if (!content) {
    throw new ApiError(400, "Tweet is required");
  }

  const tweetData = await Tweet.create({
    owner: req.user?._id,
    content: content,
  });

  if (!tweetData) {
    throw new ApiError(400, "tweet created problem");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tweetData, "Tweet created successfull"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets

  const { userId } = req.body;

  if (userId) {
    throw new ApiError(400, "User id required");
  }

  const tweetUser = await Tweet.findById(userId);

  if (!tweetUser || !(tweetUser.owner.toString() == req.user._id.toString())) {
    throw new ApiError(400, "user doesnot found");
  }

  const userTweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId.createFromHexString(userId),
      },
    },
    {
      $project: {
        content: 1,
      },
    },
  ]);

  if (!userTweets) {
    throw new ApiError(400, "user tweets not existed");
  }

  return res.status(200).json(new ApiResponse(200, userTweets, "user tweets"));
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet

  const { tweetId } = req.params;
  const { newContent } = req.body;

  if (!tweetId) {
    throw new ApiError(400, "User Id is required");
  }

  const userTweet = await Tweet.findById(tweetId);

  if (!userTweet) {
    throw new ApiError(400, "Tweet not exists");
  }

  if (!(userTweet.owner.toString() === req.usre._id.toString())) {
    throw new ApiError(400, "You cannot delete this tweet");
  }

  try {
    const updatedTweet = await Tweet.findByIdAndUpdate(
      tweetId,
      {
        $set: {
          content: newContent,
        },
      },
      {
        new: true,
      }
    );
    if (!updateTweet) {
      throw new ApiError(400, "probem in updation of tweet");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, updatedTweet, "Tweet updated successfully"));
  } catch (error) {
    throw new ApiError(
      500,
      error?.message || "Enternal Issue while updating tweet"
    );
  }
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet

  const { tweetId } = req.params;

  if (!tweetId) {
    throw new ApiError(400, "tweet id not found");
  }

  const tweetFound = await Tweet.findById(tweetId);
  if (!tweetFound) {
    throw new ApiError(400, "tweet does not exitsed");
  }

  if (!(tweetFound.owner.toString() === req.user?._id.toString())) {
    throw new ApiError(400, "user should be loggined with same id");
  }
  try {
    const tweetDeleted = await Tweet.findByIdAndDelete(
      { _id: tweetId },
      { new: true }
    );
    if (!tweetDeleted) {
      throw new ApiError(400, "there is a problem while deleting the tweet");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, "tweet successfully deleted"));
  } catch (error) {
    throw new ApiError(401, error?.message || "tweet cannot be deleted");
  }
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
