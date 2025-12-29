import User, { LastActiveRole } from '../schema/User';
import { Request, Response } from 'express';
import { createResponse } from '../helper/response';
import crypto from 'crypto';
import { sendEmail } from '../services/email';
import createHttpError from "http-errors";
import BlockList from '../schema/BlockList';
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Address from '../schema/Address';
import Report from '../schema/Report';
import Subscription, { SubscriptionStatus } from '../schema/Subscription';
import Post from '../schema/Post';

interface JwtPayload {
  email: string;
  iat?: number;
  exp?: number;
}

interface UserFilter {
  isCreator: boolean;
  $or?: { [key: string]: RegExp }[];
  category_id?: mongoose.Types.ObjectId;
  _id?: {}
}

export const getUser = async (req: Request, res: Response) => {
  const user_id = req.user?._id;
  const creatorId = req.query?.creatorId as string;
  const idToFetch = creatorId || user_id;

  if (!idToFetch) {
    throw createHttpError(400, {
      msg: 'No user ID provided'
    });
  }

  const user = await User.findById(idToFetch).select('-password -notInterestedPosts').populate('category_id');
  if (!user) {
    throw createHttpError(404, {
      msg: 'User not found with the provided ID'
    });
  }

  let isSubscribed = false;
  let postCount = 0;

  if (creatorId && user_id) {
    const subscription = await Subscription.findOne({
      user_id: user_id,
      subscribedTo: creatorId,
      expiryDate: { $gte: new Date() },
      status: SubscriptionStatus.ACTIVE
    }).exec();

    isSubscribed = !!subscription;

    postCount = await Post.countDocuments({ user_id: creatorId })
  }

  res.send(createResponse({
    status: 200,
    user: {
      ...user.toObject(),
      isSubscribed,
      postCount
    }
  }));
};

export const sendOtp = async (req: Request, res: Response) => {
  const { email } = req.body;
  const user = await User.findOne({ email }).lean();
  if (!user) {
    throw createHttpError(404, { message: 'User not found' });
  }
  const otp = crypto.randomInt(100000, 999999);
  user.otp = otp;
  const otp_expiration = Date.now() + 10 * 60 * 1000;
  await User.findByIdAndUpdate(user?._id, { "$set": { otp: otp, otp_expiration: otp_expiration } }).lean();

  const mailOptions = {
    from: 'ritik.75Way@gmail.com',
    to: email,
    subject: 'OTP for Password Reset at Valuegivr',
    text: `Hello, We hope you are doing well.
        You have requested a password reset otp at valuegivr.
        Your OTP is ${otp}. It will expire in 10 minutes.`
  };

  await sendEmail(mailOptions);

  res.send(createResponse({ message: 'OTP sent successfully' }));
}

export const verifyOtp = async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    throw createHttpError(404, { message: 'User not found' });
  }
  if (user.otp != otp || user.otp_expiration < Date.now()) {
    throw createHttpError(401, { message: 'Invalid or expired OTP' });
  }
  user.otp = 0;
  user.otp_expiration = 0;
  await user.save();

  const secret = process.env.JWT_SECRET || "";
  const passwordResetToken = jwt.sign({ email: user.email }, secret, { expiresIn: '1h' })

  res.send(createResponse({ message: 'OTP verified successfully', passwordResetToken }));
};

export const resetPassword = async (req: Request, res: Response) => {
  const { passwordResetToken, newPassword } = req.body;
  const secret = process.env.JWT_SECRET || "";
  const decoded = jwt.verify(passwordResetToken, secret) as JwtPayload;
  const email = decoded?.email;

  const user = await User.findOne({ email });
  if (!user) {
    throw createHttpError(404, { message: 'User not found' });
  }

  user.password = newPassword;
  await user.save();

  res.send(createResponse({ message: 'Password updated successfully' }));
}


export const updatePassword = async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user?._id;

  const user = await User.findById(userId);

  if (!user) {
    throw createHttpError(404, { message: "User not Found" });
  }

  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

  const isSamePassword = await bcrypt.compare(newPassword, user.password);

  if (!isPasswordValid) {
    throw createHttpError(404, { message: "Current password is incorrect" });
  }

  if(isSamePassword){
    throw createHttpError(400, { message: "New password should not be same as old password" });
  }

  user.password = newPassword;
  await user.save();

  res.send(createResponse({}, "Password updated successfully"));
}

export const blockUser = async (req: Request, res: Response) => {
  const user_id = req.body?.user_id;
  const blocked_by = req.user?._id;

  const user = await User.findById(user_id);
  if (!user) {
    throw createHttpError(404, { message: 'User not found' });
  }

  const existingBlock = await BlockList.findOne({ user_id, blocked_by });
  if (existingBlock) {
    throw createHttpError(409, { message: 'User already blocked' });
  }

  const blockEntry = new BlockList({ user_id, blocked_by });
  await blockEntry.save();

  res.send(createResponse({ message: 'User blocked successfully' }));
}

export const unblockUser = async (req: Request, res: Response) => {
  const user_id = req.params?.userId;
  const blocked_by = req.user?._id;
  console.log(user_id, blocked_by)

  const existingBlock = await BlockList.findOneAndDelete({ user_id, blocked_by: blocked_by });

  if (!existingBlock) {
    throw createHttpError(404, { message: 'User is not blocked' });
  }

  res.send(createResponse({ message: 'User unblocked successfully' }));
}

export const getBlockList = async (req: Request, res: Response) => {
  const userId = req.user?._id;

  const blockedUsers = await BlockList.find({ blocked_by: userId })
    .populate({
      path: 'user_id',
      model: 'user',
    })
    .lean();

  res.send(createResponse({ blockedUsers }));
}

export const getSearchedUsers = async (req: Request, res: Response) => {
  const { page = 1, limit = 8, searchString = '', category } = req.query;
  const userId = req.user?._id;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);

  const filter: UserFilter = { isCreator: true };

  if (searchString) {
    const searchRegex = new RegExp(searchString as string, 'i');
    filter.$or = [
      { displayName: searchRegex },
      { username: searchRegex },
    ];
  }

  if (category) {
    filter.category_id = new mongoose.Types.ObjectId(category as string);
  }

  const blockedUsers = await BlockList.find({
    $or: [
      { user_id: userId },
      { blocked_by: userId }
    ]
  }).exec();

  const blockedUserIds = new Set<string>(
    blockedUsers.flatMap(block => [block.user_id.toString(), block.blocked_by.toString()])
  );

  filter._id = { $nin: Array.from(blockedUserIds) };

  const users = await User.find(filter)
    .sort({ total_subscriber: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum)
    .select('displayName username profile_picture cover_image')
    .lean();

  const count = await User.countDocuments(filter);

  res.send(createResponse({
    users,
    count,
    page: pageNum,
    pages: Math.ceil(count / limitNum),
  }));
};

export const addAddress = async (req: Request, res: Response) => {
  const user_id = req.user?._id;
  const { firstName, ...rest } = req.body;
  console.log(req.body)
  const newAddress = new Address({
    user_id,
    firstName,
    ...rest
  });

  await newAddress.save();

  res.send(createResponse({
    message: 'Address added successfully',
    address: newAddress,
  }));
}

export const updateAddress = async (req: Request, res: Response) => {
  const user_id = req.user?._id;
  const { id } = req.params;
  const { firstName, ...rest } = req.body;

  const updatedAddress = await Address.findOneAndUpdate(
    { _id: id, user_id },
    { firstName, ...rest },
    { new: true, runValidators: true }
  );

  if (!updatedAddress) {
    throw (createHttpError(400, {
      message: 'Address not found or you do not have permission to update this address',
    }));
  }

  res.send(createResponse({
    message: 'Address updated successfully',
    updatedAddress,
  }));
};

export const getUserAddresses = async (req: Request, res: Response) => {
  const user_id = req.user?._id;

  const addresses = await Address.find({ user_id });

  if (!addresses.length) {
    throw (createHttpError({
      message: 'No addresses found for this user',
    }));
  }

  res.send(createResponse({
    message: 'Addresses retrieved successfully',
    addresses,
  }));
};

export const getTrendingUsers = async (req: Request, res: Response) => {
  const trendingUsers = await User.find()
    .sort({ total_subscriber: -1 })
    .limit(12)
    .select('username total_subscriber avatar displayName cover_image profile_picture')
    .exec();

  res.send(createResponse({ users: trendingUsers }));
}

export const getSuggestions = async (req: Request, res: Response) => {
  const randomUsers = await User.aggregate([
    { $sample: { size: 3 } },
    { $project: { username: 1, displayName: 1, _id: 1, profile_picture: 1 } }
  ]).exec();

  res.send(createResponse({ users: randomUsers }));
}

export const reportUser = async (req: Request, res: Response) => {
  const userId = req.body.userId;
  const reportedBy = req.user?._id;
  const { reason } = req.body;

  const existingReport = await Report.findOne({
    user_id: userId,
    reportedBy: reportedBy,
  });

  if (existingReport) {
    throw createHttpError({ message: 'You have already reported this user.' });
  }

  const newReport = new Report({
    user_id: userId,
    reportedBy: reportedBy,
    reason: reason,
  });

  await newReport.save();

  const existingBlock = await BlockList.findOne({ user_id: userId, blocked_by: reportedBy });
  if (existingBlock) {
    throw createHttpError(409, { message: 'User already blocked' });
  }

  const blockEntry = new BlockList({ user_id: userId, blocked_by: reportedBy });
  await blockEntry.save();

  res.send(createResponse({ message: 'User reported successfully.', report: newReport }));
};

export const switchProfile = async (req: Request, res: Response) => {
  const userId = req.user?._id;
  const user = await User.findById(userId);

  if (!user) {
    throw createHttpError({ message: "User not found" });
  }

  if (user.lastActiveRole === LastActiveRole.CREATOR) {
    user.lastActiveRole = LastActiveRole.FAN;
  } else if (user.lastActiveRole === LastActiveRole.FAN) {
    user.lastActiveRole = LastActiveRole.CREATOR;
  }

  user.isFan = true;
  user.isCreator = true;

  user.markModified('lastActiveRole');
  await user.save({ validateModifiedOnly: true });

  res.send(createResponse({
    message: "Profile switched successfully",
    lastActiveRole: user.lastActiveRole,
    isFan: user.isFan,
    isCreator: user.isCreator,
  }));
};


