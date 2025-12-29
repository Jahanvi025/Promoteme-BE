import Post, { PostType } from '../schema/Post';
import { Request, Response } from 'express';
import { createResponse } from '../helper/response';
import fs from 'fs';
import createHttpError from "http-errors";
import cloudinary from 'cloudinary'
import Product from '../schema/Product';
import User, { IUser } from '../schema/User';
import mongoose, { Types } from 'mongoose';
import Subscription from '../schema/Subscription';
import BlockList from '../schema/BlockList';

interface CombinedItem {
    _id: string;
    user_id: Types.ObjectId | IUser;
    isProduct?: boolean;
    isBookmarked: boolean;
    isSubscribed?: boolean;
}

export const uploadFiles = async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];
    const uploadedFileUrls = [];
    for (const file of files) {
        const result = await cloudinary.v2.uploader.upload(file.path, {
            resource_type: 'auto'
        });
        uploadedFileUrls.push(result.secure_url);
        fs.unlinkSync(file?.path);
    }
    res.send(createResponse(uploadedFileUrls, 'Files uploaded successfully'));
}

const getCombinedItems = async (
    matchCriteria: object,
    skip: number,
    limit: number,
    userId: string | undefined,
    notInterestedPosts: mongoose.Types.ObjectId[]
): Promise<CombinedItem[]> => {
    const userObjectId = userId ? new mongoose.Types.ObjectId(userId) : null;

    return Post.aggregate([
        { $match: { ...matchCriteria, status: { $ne: 'INACTIVE' }, _id: { $nin: notInterestedPosts } } },
        {
            $unionWith: {
                coll: "products",
                pipeline: [
                    { $match: { ...matchCriteria, status: { $ne: 'INACTIVE' } } },
                    { $addFields: { isProduct: true } }
                ]
            }
        },
        {
            $lookup: {
                from: "blocklists",
                let: { postOwnerId: "$user_id", currentUserId: userObjectId },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $or: [
                                    { $and: [{ $eq: ["$user_id", "$$postOwnerId"] }, { $eq: ["$blocked_by", "$$currentUserId"] }] },
                                    { $and: [{ $eq: ["$user_id", "$$currentUserId"] }, { $eq: ["$blocked_by", "$$postOwnerId"] }] }
                                ]
                            }
                        }
                    }
                ],
                as: "blockDetails"
            }
        },

        { $match: { "blockDetails.0": { $exists: false } } },

        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
            $lookup: {
                from: "users",
                localField: "user_id",
                foreignField: "_id",
                as: "userDetails"
            }
        },
        { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "subscriptions",
                let: { creatorId: "$user_id", userId: userObjectId },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$subscribedTo", "$$creatorId"] },
                                    { $eq: ["$user_id", "$$userId"] }
                                ]
                            }
                        }
                    }
                ],
                as: "subscriptionDetails"
            }
        },
        {
            $addFields: {
                user_id: {
                    _id: { $ifNull: ["$userDetails._id", null] },
                    displayName: { $ifNull: ["$userDetails.displayName", ""] },
                    profile_picture: { $ifNull: ["$userDetails.profile_picture", ""] }
                },
                isLiked: {
                    $cond: {
                        if: { $and: [{ $ne: [userObjectId, null] }, { $isArray: "$likedBy" }] },
                        then: { $in: [userObjectId, "$likedBy"] },
                        else: false
                    }
                },
                isBookmarked: {
                    $cond: {
                        if: { $and: [{ $ne: [userObjectId, null] }, { $isArray: "$bookMarkedBy" }] },
                        then: { $in: [userObjectId, "$bookMarkedBy"] },
                        else: false
                    }
                },
                isPurchased: {
                    $cond: {
                        if: { $and: [{ $ne: [userObjectId, null] }, { $isArray: "$purchasedBy" }] },
                        then: { $in: [userObjectId, "$purchasedBy"] },
                        else: false
                    }
                },
                isSubscribed: {
                    $cond: {
                        if: {
                            $and: [
                                { $gt: [{ $size: "$subscriptionDetails" }, 0] },
                                { $eq: [{ $arrayElemAt: ["$subscriptionDetails.status", 0] }, "ACTIVE"] }
                            ]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                userDetails: 0,
                likedBy: 0,
                bookMarkedBy: 0,
                purchasedBy: 0,
                subscriptionDetails: 0,
                blockDetails: 0
            }
        }
    ]);
};

export const getPosts = async (req: Request, res: Response) => {
    const userId = req.user?._id || "";
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const postType = req.query.type as PostType | undefined;
    const fromDate = req.query.fromDate as string;
    const toDate = req.query.toDate as string;
    const status = req.query.status as string;
    const searchString = req.query.searchString as string;
    const filter = req.query.filter as string;
    const role = req.query?.role as string;
    const creatorId = req.query.creatorId as string;

    const user = await User.findById(userId).exec();
    const notInterestedPostIds = user?.notInterestedPosts.map(post => post.toString()) || [];

    const isCreator = role === "CREATOR" || creatorId === userId;

    if (isCreator || creatorId) {
        const query: { user_id: string; type?: PostType; createdAt?: any; status?: string; description?: any, _id: {} } = {
            user_id: creatorId ? creatorId : userId,
            _id: { $nin: notInterestedPostIds }
        };

        if (postType) {
            query.type = postType;
        }

        if (fromDate && toDate) {
            const fromDateObj = new Date(fromDate);
            const toDateObj = new Date(toDate);
            toDateObj.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: fromDateObj, $lte: toDateObj };
        } else if (toDate) {
            const toDateObj = new Date(toDate);
            toDateObj.setHours(23, 59, 59, 999);
            query.createdAt = { $lte: toDateObj };
        } else if (fromDate) {
            const fromDateObj = new Date(fromDate);
            query.createdAt = { $gte: fromDateObj };
        }

        if (status) {
            query.status = status;
        }

        if (searchString) {
            query.description = { $regex: new RegExp(searchString, 'i') };
        }

        const totalPosts = await Post.countDocuments(query);

        const posts = await Post.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('user_id', 'displayName profile_picture')
            .exec();

        const subscriptions = userId
            ? await Subscription.find({ user_id: userId }).exec()
            : [];

        const subscribedUserIds = new Set(subscriptions.map(sub => sub.subscribedTo.toString()));

        const postsWithAdditionalInfo = posts.map(post => {
            const postObj = post.toObject();
            const isPurchased = userId ? postObj.purchasedBy.some((id: any) => id.equals(new mongoose.Types.ObjectId(userId))) : false;
            const isSubscribed = subscribedUserIds.has(postObj.user_id._id.toString());
            const { purchasedBy, ...postResponse } = postObj;

            return {
                ...postResponse,
                isPurchased,
                isSubscribed
            };
        });

        res.send(createResponse({
            page: page,
            limit: limit,
            count: totalPosts,
            posts: postsWithAdditionalInfo
        }));
    } else {
        let combinedItems: CombinedItem[];
        let totalItems = 0;

        const blockedUsers = await BlockList.find({
            $or: [
                { user_id: userId },
                { blocked_by: userId }
            ],
        }).exec();

        const blockedUserIds = new Set<string>(
            blockedUsers.flatMap(block => [block.user_id.toString(), block.blocked_by.toString()])
        );
        switch (filter) {
            case "Recents":
                combinedItems = await getCombinedItems({ _id: { $nin: notInterestedPostIds } }, skip, limit, userId, notInterestedPostIds.map(id => new mongoose.Types.ObjectId(id))
                );
                const totalPostsCountRecents = await Post.countDocuments({ status: { $ne: 'INACTIVE' }, _id: { $nin: notInterestedPostIds } });
                const totalProductsCount = await Product.countDocuments({ status: { $ne: 'INACTIVE' }, _id: { $nin: notInterestedPostIds } });
                totalItems = totalPostsCountRecents + totalProductsCount;
                break;

            case "Popular":
                const posts = await Post.find({
                    status: { $ne: 'INACTIVE' }, _id: { $nin: notInterestedPostIds }, user_id: { $nin: Array.from(blockedUserIds) }
                })
                    .sort({ likes: -1, _id: 1 })
                    .skip(skip)
                    .limit(limit)
                    .populate('user_id', '_id displayName profile_picture');

                totalItems = await Post.countDocuments({
                    status: { $ne: 'INACTIVE' }, _id: { $nin: notInterestedPostIds }, user_id: { $nin: Array.from(blockedUserIds) }
                });

                let subscriptions = [];
                if (userId) {
                    subscriptions = await Subscription.find({ user_id: userId }).select('subscribedTo');
                }

                combinedItems = posts.map(post => {
                    const postObj = post.toObject();
                    const isLiked = userId ? postObj.likedBy.some(id => id.equals(new mongoose.Types.ObjectId(userId))) : false;
                    const isBookmarked = userId ? postObj.bookMarkedBy.some(id => id.equals(new mongoose.Types.ObjectId(userId))) : false;
                    const isPurchased = userId ? postObj.purchasedBy.some(id => id.equals(new mongoose.Types.ObjectId(userId))) : false;
                    const isSubscribed = userId
                        ? subscriptions.some(sub => sub.subscribedTo.equals(postObj.user_id?._id))
                        : false;

                    const { bookMarkedBy, likedBy, purchasedBy, ...postResponse } = postObj;

                    return {
                        ...postResponse,
                        isLiked,
                        isBookmarked,
                        isPurchased,
                        isSubscribed
                    };
                });
                break;

            case "Following":
                const subscribers = await Subscription.find({ user_id: userId }).select('subscribedTo').exec();
                const subscribedUserIds = subscribers.map(subscriber => subscriber.subscribedTo);

                combinedItems = await getCombinedItems({ user_id: { $in: subscribedUserIds }, _id: { $nin: notInterestedPostIds } }, skip, limit, userId, notInterestedPostIds.map(id => new mongoose.Types.ObjectId(id))
                );
                const totalPostsCountFollowing = await Post.countDocuments({ user_id: { $in: subscribedUserIds }, status: { $ne: 'INACTIVE' }, _id: { $nin: notInterestedPostIds } });
                const totalProductsCountFollowing = await Product.countDocuments({ user_id: { $in: subscribedUserIds }, status: { $ne: 'INACTIVE' }, _id: { $nin: notInterestedPostIds } });
                totalItems = totalPostsCountFollowing + totalProductsCountFollowing;
                break;

            default:
                res.status(400).send({ error: "Invalid filter" });
                return;
        }

        res.send(createResponse({ page, limit, count: totalItems, posts: combinedItems }));
    }
};


export const createPost = async (req: Request, res: Response) => {
    const user_id = req.user?._id;
    const { ...rest } = req.body;
    const post = await Post.create({
        user_id,
        ...rest
    });
    res.send(createResponse({ post }, "Post created successfully"))
};

export const deletePost = async (req: Request, res: Response) => {
    const postId = req.params.id;
    const userId = req.user?._id;

    const post = await Post.findById(postId);
    if (!post) {
        throw createHttpError(404, { message: 'Post not found' });
    }

    if (post.user_id.toString() !== userId) {
        throw createHttpError(403, { message: 'Unauthorized to delete this post' });
    }

    await Post.deleteOne({ _id: postId });

    res.send(createResponse({ message: 'Post deleted successfully' }));
}

export const editStatus = async (req: Request, res: Response) => {
    const postId = req.params.id;
    const { status } = req.body;
    const userId = req.user?._id;

    const post = await Post.findById(postId);

    if (!post) {
        throw createHttpError(404, { message: 'Post not found' });
    }

    if (post.user_id.toString() !== userId) {
        throw createHttpError(403, { message: 'Unauthorized to edit this post' });
    }

    post.status = status;
    const updatedPost = await post.save();

    res.send(createResponse({
        message: 'Post status updated successfully',
        post: updatedPost
    }));
}

export const editPost = async (req: Request, res: Response) => {
    const postId = req.params.id;
    const { type, ...rest } = req.body;
    const userId = req.user?._id;

    const post = await Post.findById(postId);

    if (!post) {
        throw createHttpError(404, { message: 'Post not found' });
    }

    if (post.user_id.toString() !== userId) {
        throw createHttpError(403, { message: 'You do not have permission to edit this post' });
    }

    const update = {
        ...(type && { type }),
        ...rest
    };

    const updatedPost = await Post.findByIdAndUpdate(postId, update, { new: true })
        .populate('user_id', 'username displayName profile_picture');
    ;

    if (!updatedPost) {
        throw createHttpError(404, { message: 'error occured while editing post' });
    }

    res.send(createResponse({ message: 'Post updated successfully', post: updatedPost }));
}

export const likePost = async (req: Request, res: Response) => {
    const postId: string = req.params.id;
    const userId = req.user?._id;

    const post = await Post.findById(postId);

    if (!post) {
        throw createHttpError(404, { message: 'Post not found' });
    }

    const likedByArray = post.likedBy as mongoose.Types.ObjectId[];

    const userAlreadyLiked = likedByArray.includes(new mongoose.Types.ObjectId(userId));

    const update = userAlreadyLiked
        ? { $pull: { likedBy: userId }, $inc: { likes: -1 } }
        : { $addToSet: { likedBy: userId }, $inc: { likes: 1 } };

    await Post.findByIdAndUpdate(postId, update, { new: true });

    const message = userAlreadyLiked
        ? 'Like removed successfully!'
        : 'Like added successfully!';

    res.send(createResponse({ message }));
}

export const bookmarkPost = async (req: Request, res: Response) => {
    const itemId = req.params?.id;
    const userId = new mongoose.Types.ObjectId(req.user?._id);
    const itemType = req.params?.type;

    if (!itemId || !userId || !itemType) {
        throw createHttpError({ message: "Invalid request" });
    }
    let updatedItem;
    let message;

    if (itemType === 'post') {
        const post = await Post.findById(itemId);

        if (!post) {
            throw createHttpError({ message: "Post not found" });
        }

        const isBookmarked = post.bookMarkedBy.includes(userId);

        const query = isBookmarked
            ? { $pull: { bookMarkedBy: userId } }
            : { $addToSet: { bookMarkedBy: userId } };

        updatedItem = await Post.findByIdAndUpdate(
            itemId,
            query,
            { new: true, projection: { likedBy: 0, bookMarkedBy: 0 } }
        ).lean();

        message = isBookmarked ? "Removed from Bookmarked" : "Bookmarked";

    } else if (itemType === 'product') {
        const product = await Product.findById(itemId);
        if (!product) {
            throw createHttpError({ message: "Product not found" });
        }

        const isBookmarked = product.bookMarkedBy.includes(userId);
        const query = isBookmarked
            ? { $pull: { bookMarkedBy: userId } }
            : { $addToSet: { bookMarkedBy: userId } };

        updatedItem = await Product.findByIdAndUpdate(
            itemId, query,
            { new: true, projection: { bookMarkedBy: 0 } }
        ).lean();

        message = isBookmarked ? "Removed from Bookmarked" : "Bookmarked";

    } else {
        throw createHttpError({ message: "Invalid item type" });
    }
    res.send(createResponse({ message, item: updatedItem }));
}

export const getBookmarks = async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const page = parseInt(req.query.page as string, 10) || 0;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const skip = (page - 1) * limit;

    const matchCriteria = { bookMarkedBy: new mongoose.Types.ObjectId(userId as string) };

    const user = await User.findById(userId).exec();
    const notInterestedPostIds = user?.notInterestedPosts.map(post => post.toString()) || [];
    const items = await getCombinedItems(matchCriteria, skip, limit, userId as string, notInterestedPostIds.map(id => new mongoose.Types.ObjectId(id))
    );

    res.send(createResponse({
        success: true,
        posts: items
    }));
};

export const purchasePost = async (req: Request, res: Response) => {
    const postId = req.params.id;
    const userId = req.user?._id;
    const paymentMethod = req.body.paymentMethod;

    if (!userId) {
        throw createHttpError({ message: 'User Id is required' })
    }

    const post = await Post.findById(postId);

    if (!post) {
        throw createHttpError({ message: "Post not found" });
    }

    const hasPurchased = post.purchasedBy.some(
        (user) => user.toString() === userId?.toString()
    );

    if (hasPurchased) {
        throw createHttpError({ message: "Post already purchased" });
    }

    post.purchasedBy.push(new mongoose.Types.ObjectId(userId));
    await post.save();

    res.send(createResponse({ message: "Post purchased successfully", post }));
}

export const markNotInterested = async (req: Request, res: Response) => {
    const postId = req.params.id;
    const userId = req.user?._id;

    if (!userId) {
        throw createHttpError({ message: 'User Id is required' })
    }

    const postExists = await Post.findById(postId);
    if (!postExists) {
        throw createHttpError(404, { message: 'Post not found' });
    }

    const user = await User.findById(userId);
    if (!user) {
        throw createHttpError(404, { message: 'User not found' });
    }


    user.notInterestedPosts.push(new mongoose.Types.ObjectId(postId));
    user.markModified('notInterestedPosts')
    await user.save({validateModifiedOnly: true});

    res.send(createResponse({ message: 'Post marked as not interested successfully' }));
}

export const sendTip = async (req: Request, res: Response) => {
    const { postId, tipAmount } = req.body;
    const userId = req.user?._id;

    if (!userId) {
        throw createHttpError(400, { message: 'User ID is required' });
    }
    const post = await Post.findById(postId);
    if (!post) {
        throw createHttpError(404, { message: 'Post not found' });
    }

    post.tip += tipAmount;
    await post.save();

    res.send(createResponse({ message: 'Tip sent successfully', newTipTotal: post.tip }));
};

export const getPost = async (req: Request, res: Response) => {
    const postId = req.params.id;

    if (!postId) {
        throw createHttpError(400, { message: 'Post ID is required' });
    }

    const post = await Post.findById(postId)
        .populate('user_id', 'displayName profile_picture')
        .select('-likedBy -purchasedBy -bookMarkedBy');

    if (!post) {
        throw createHttpError(400, { message: 'Post not found' });
    }

    res.send(createResponse({ post }));
}
