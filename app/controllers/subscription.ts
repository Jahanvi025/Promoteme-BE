import User from '../schema/User';
import { Request, Response } from 'express';
import { createResponse } from '../helper/response';
import createHttpError from "http-errors";
import Subscription, { SubscriptionStatus, SubscriptionType } from '../schema/Subscription';
import mongoose, { Types } from 'mongoose';
import Payment, { IPayment, PaymentStatus } from '../schema/Payment';

export const subscribeToCreator = async (req: Request, res: Response) => {
    const { creatorId, type, paymentMethod } = req.body;
    const userId = req.user?._id;

    const [currentUser, creator] = await Promise.all([
        User.findById(userId).select('isFan'),
        User.findById(creatorId)
    ]);

    if (!currentUser || !creator) {
        throw createHttpError(404, { message: "User or creator not found" });
    }

    if (!currentUser.isFan) {
        throw createHttpError(400, { message: "Only fans can subscribe" });
    }

    if (!creator.isCreator) {
        throw createHttpError(400, { message: "You can subscribe to a creator only" });
    }
    const startDate = new Date();
    const expiryDate = new Date(startDate);

    if (type === 'MONTHLY') {
        expiryDate.setMonth(startDate.getMonth() + 1);
    } else if (type === 'YEARLY') {
        expiryDate.setFullYear(startDate.getFullYear() + 1);
    } else {
        throw createHttpError(400, { message: "Invalid subscription type" });
    }

    const existingSubscription = await Subscription.findOne({
        user_id: userId,
        subscribedTo: creatorId
    }).exec();

    if (existingSubscription?.status === SubscriptionStatus.EXPIRED) {
        await Subscription.findByIdAndUpdate(existingSubscription._id, {
            status: SubscriptionStatus.ACTIVE,
            startDate,
            expiryDate
        }).exec();
    }
    else if (existingSubscription?.status === SubscriptionStatus.ACTIVE) {
        throw createHttpError(400, { message: "Already subscribed to this creator" });
    }

    const newSubscription = new Subscription({
        user_id: userId,
        subscribedTo: creatorId,
        type,
        startDate,
        expiryDate,
        paymentMethod,
        status: SubscriptionStatus.ACTIVE
    });

    await newSubscription.save();

    const paymentData: Partial<IPayment> = {
        user_id: new mongoose.Types.ObjectId(userId),
        status: PaymentStatus.DONE,
        paidTo: creatorId as Types.ObjectId,
        type: `${type} Subscription`,
        paymentMethod: "Stripe",
        amount: type === "YEARLY" ? creator.yearly_Price : creator?.monthly_Price,
    };

    const payment = new Payment(paymentData);
    await payment.save();

    await User.findByIdAndUpdate(creatorId, {
        $inc: { total_subscribers: 1 }
    }).exec();

    res.send(createResponse({
        message: "Subscription created successfully",
        subscription: newSubscription
    }));
};

export const getSubscriptions = async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const skip = (page - 1) * limit;
    const searchString = req.query.searchString as string;
    const fromDate = req.query.fromDate as string;
    const toDate = req.query.toDate as string;
    const subscriptionType = req.query.type as SubscriptionType;

    const pipeline: any[] = [
        { $match: { user_id: new mongoose.Types.ObjectId(userId) } },
        {
            $lookup: {
                from: 'users',
                let: { subscribedToId: '$subscribedTo' },
                pipeline: [
                    { $match: { $expr: { $eq: ['$_id', '$$subscribedToId'] } } },
                    { $project: { _id: 1, displayName: 1, profile_picture: 1 } }
                ],
                as: 'creator'
            }
        },
        { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true } },
        {
            $addFields: {
                isExpired: {
                    $cond: {
                        if: { $lte: ['$expiryDate', new Date()] },
                        then: true,
                        else: false
                    }
                }
            }
        }
    ];

    if (searchString) {
        pipeline.push({
            $match: {
                'creator.displayName': { $regex: new RegExp(searchString, 'i') }
            }
        });
    }

    if (subscriptionType) {
        pipeline.push({
            $match: {
                type: subscriptionType
            }
        });
    }

    if (fromDate || toDate) {
        const dateFilter: any = {};
        if (fromDate) {
            const fromDateObj = new Date(fromDate);
            dateFilter.$gte = fromDateObj;
        }
        if (toDate) {
            const toDateObj = new Date(toDate);
            toDateObj.setHours(23, 59, 59, 999);
            dateFilter.$lte = toDateObj;
        }
        pipeline.push({ $match: { startDate: dateFilter } });
    }

    pipeline.push(
        { $skip: skip },
        { $limit: limit }
    );

    const [subscriptions, totalSubscriptions] = await Promise.all([
        Subscription.aggregate(pipeline),
        Subscription.countDocuments({ user_id: userId })
    ]);

    res.send(createResponse({
        page,
        limit,
        count: totalSubscriptions,
        subscriptions
    }));
};

export const cancelSubscription = async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const subscriptionId = req.params.id;

    if (!subscriptionId) {
        throw createHttpError(400, { message: "Subscription ID is required" });
    }

    if (!userId) {
        throw createHttpError(400, { message: "User is not authenticated" });
    }

    const subscription = await Subscription.findById(subscriptionId).exec();

    if (!subscription) {
        throw createHttpError(404, { message: "Subscription not found" });
    }


    if (subscription.user_id.toString() !== userId.toString()) {
        throw createHttpError(403, { message: "Unauthorized to cancel this subscription" });
    }

    if (subscription.expiryDate <= new Date()) {
        throw createHttpError(400, { message: "Subscription is already expired or canceled" });
    }

    subscription.status = SubscriptionStatus.EXPIRED;
    await subscription.save();

    await User.findByIdAndUpdate(userId, {
        $inc: { total_subscriptions: -1 }
    }).exec();

    await Payment.updateMany(
        { user_id: new mongoose.Types.ObjectId(userId), type: 'Subscription' },
        { $set: { status: 'Canceled' } }
    );

    res.send(createResponse({
        message: "Subscription canceled successfully",
        subscription
    }));
};