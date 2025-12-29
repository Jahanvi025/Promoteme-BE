import Post from "../schema/Post";
import { Request, Response } from "express";
import { createResponse } from "../helper/response";
import Comment from "../schema/Comment";
import createHttpError from "http-errors";
import mongoose from "mongoose";

const validateComment = async (req: Request, commentId: any) => {
  const userId = req.user?._id;
  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw createHttpError(400, { message: "Product not found" });
  }
  console.log(userId, comment.user_id);
  if (comment?.user_id.toString() != userId) {
    return false;
  }
  return true;
};

export const comment = async (req: Request, res: Response) => {
  const post_id = req.params.postId;
  const { comment } = req.body;
  const user_id = req.user?._id;
  console.log(user_id);
  const post = await Post.findById(post_id);
  if (!post) {
    throw createHttpError(404, {
      error: "No post found with the given postId",
    });
  }
  const data = await Comment.create({
    post_id,
    user_id,
    comment,
  });

  post.comments += 1;
  await post.save();

  await data.populate("user_id", "username profile_picture");

  res.send(createResponse(data, "Comment added successfully"));
};

export const replyToComment = async (req: Request, res: Response) => {
  const { comment } = req.body;
  const parent_id = req.params.id;
  const user_id = req.user?._id;

  const parent = await Comment.findById(parent_id);

  if (!parent) {
    throw createHttpError(404, {
      message: "No Comment found with the given parentId",
    });
  }

  const post_id = parent.post_id;

  const post = await Post.findById(post_id);
  if (!post) {
    throw createHttpError(404, {
      error: "No post found with the given postId",
    });
  }

  const replyComment = await Comment.create({
    parent_id,
    user_id,
    post_id,
    comment,
  });
  res.send(createResponse({ replyComment }, "Reply added successfully"));
};

export const likeComment = async (req: Request, res: Response) => {
  const commentId: string = req.params.id;
  const userId = req.user?._id;

  const comment = await Comment.findById(commentId).populate("likedBy");

  if (!comment) {
    throw createHttpError(404, { message: "Comment not found" });
  }

  const userAlreadyLiked = comment.likedBy.includes(
    new mongoose.Types.ObjectId(userId)
  );

  const update = userAlreadyLiked
    ? { $pull: { likedBy: userId }, $inc: { likes: -1 } }
    : { $addToSet: { likedBy: userId }, $inc: { likes: 1 } };

  await Comment.findByIdAndUpdate(commentId, update, { new: true });

  const message = userAlreadyLiked
    ? "Like removed successfully!"
    : "Like added successfully!";

  res.send(createResponse({ message }));
};

export const deleteComment = async (req: Request, res: Response) => {
  const commentId = req.params.id;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw createHttpError(404, { message: "Comment not found" });
  }

  const childComments = await Comment.find({ parent_id: commentId });
  if (childComments.length > 0) {
    const result = await Comment.deleteMany({ parent_id: commentId });
    if (result.deletedCount === 0) {
      throw createHttpError(400, {
        message: "Some error occurred while deleting child comments",
      });
    }
  }

  const deleteParentResult = await Comment.deleteOne({ _id: commentId });
  if (deleteParentResult.deletedCount === 0) {
    throw createHttpError(400, {
      message: "Error occurred while deleting the comment",
    });
  }

  const post = await Post.findById(comment.post_id);
  if (post) {
    post.comments -= 1;
    await post.save();
  } else {
    throw createHttpError(404, { message: "Post not found" });
  }

  res.send({ message: "Comment deleted successfully" });
};

export const getComments = async (req: Request, res: Response) => {
  const postId = req.params.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const comments = await Comment.find({
    post_id: postId,
    $or: [{ parent_id: { $exists: false } }, { parent_id: null }],
  })
    .populate({
      path: "user_id",
      select: "username profile_picture",
    })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const totalComments = await Comment.countDocuments({
    post_id: postId,
    $or: [{ parent_id: { $exists: false } }, { parent_id: null }],
  });

  res.send(
    createResponse({
      count: totalComments,
      page,
      pages: Math.ceil(totalComments / limit),
      comments,
    })
  );
};

export const getReplies = async (req: Request, res: Response) => {
  const commentId = req.params.commentId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const replies = await Comment.find({ parent_id: commentId })
    .populate({
      path: "user_id",
      select: "username profile_picture",
    })
    .skip(skip)
    .limit(limit);
  const totalReplies = await Comment.countDocuments({ parent_id: commentId });

  res.send(
    createResponse({
      count: totalReplies,
      page,
      pages: Math.ceil(totalReplies / limit),
      replies,
    })
  );
};
