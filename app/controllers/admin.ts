import { Request, Response } from "express";
import Category from "../schema/Category";
import { createResponse } from "../helper/response";
import createHttpError from "http-errors";
import Report from "../schema/Report";
import User from "../schema/User";
import Subscription from "../schema/Subscription";
import Post from "../schema/Post";

export const getReports = async (req: Request, res: Response) => {
    const { page = 1, limit = 10, userId } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const reports = await Report.find({})
        .populate('user_id reportedBy', 'username displayName profile_picture blocked')
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 });

    const count = await Report.countDocuments({});

    const reportsWithCount = await Promise.all(
        reports.map(async (report) => {
            const userReportCount = await Report.countDocuments({ user_id: report.user_id });
            return {
                ...report.toObject(),
                reportCount: userReportCount,
            };
        })
    );

    res.send(createResponse({
        reports: reportsWithCount,
        count,
        currentPage: Number(page),
        totalPages: Math.ceil(count / Number(limit)),
    }));
};

export const blockUser = async (req: Request, res: Response) => {
    const userId = req.params?.id;

    const user = await User.findByIdAndUpdate(
        userId,
        { blocked: true },
        { new: true }
    );

    if (!user) {
        throw createHttpError(400, { message: "User not found" });
    }

    res.send(createResponse({
        message: `user ${user.displayName} has been blocked successfully`
    }));
}

export const usersList = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.searchString as string || '';
    const isCreator = req.query.isCreator === 'true';

    const skip = (page - 1) * limit;

    const searchFilter = search
        ? {
            $or: [
                { username: { $regex: search, $options: 'i' } },
                { displayName: { $regex: search, $options: 'i' } }
            ],
        }
        : {};

    const filter = {
        ...(isCreator ? { isCreator: true } : { isFan: true }),
        ...searchFilter,
    };

    const users = await User.find(filter)
        .select('username displayName profile_picture email blocked createdAt total_subscribers')
        .skip(skip)
        .limit(limit);

    const totalUsers = await User.countDocuments(filter);

    const totalPages = Math.ceil(totalUsers / limit);

    res.send(createResponse({ users, totalPages, totalUsers }));
}

export const getDashboardData = async (req: Request, res: Response) => {
    const totalUsers = await User.countDocuments();
    const totalPosts = await Post.countDocuments();

    const activeUsersCount = await User.countDocuments({ active: true, blocked: false });
    const creatorsCount = await User.countDocuments({ isCreator: true });
    const fansCount = await User.countDocuments({ isFan: true });

    const postTypeCounts = await Post.aggregate([
        {
            $group: {
                _id: '$type',
                count: { $sum: 1 }
            }
        }
    ]);

    const postTypeStats = postTypeCounts.reduce((acc: any, curr: any) => {
        acc[curr._id] = curr.count;
        return acc;
    }, {});

    res.send(createResponse({
        totalUsers,
        activeUsers: activeUsersCount,
        creators: creatorsCount,
        fans: fansCount,
        totalPosts,
        postTypeStats: {
            TEXT: postTypeStats['TEXT'] || 0,
            IMAGE: postTypeStats['IMAGE'] || 0,
            AUDIO: postTypeStats['AUDIO'] || 0,
            VIDEO: postTypeStats['VIDEO'] || 0
        }
    }));
};