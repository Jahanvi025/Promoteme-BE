import { Request, Response } from 'express';
import { createResponse } from '../helper/response';
import Conversation from '../schema/Conversation';
import Message, { MessageStatus } from '../schema/Message';
import User from '../schema/User';
import createHttpError from "http-errors";
import mongoose, { ObjectId, Types } from 'mongoose';
import BlockList from '../schema/BlockList';

export const getConversations = async (req: Request, res: Response) => {
    const userId = new mongoose.Types.ObjectId(req.user?._id);

    const conversations = await Conversation.aggregate([
        {
            $match: {
                participants: userId,
                isDeleted: { $ne: true }
            }
        },
        {
            $addFields: {
                otherParticipantId: {
                    $arrayElemAt: [
                        {
                            $filter: {
                                input: '$participants',
                                as: 'participant',
                                cond: { $ne: ['$$participant', userId] }
                            }
                        }, 0
                    ]
                }
            }
        },
        {
            $lookup: {
                from: 'blocklists',
                let: { userId: userId, otherUserId: '$otherParticipantId' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $or: [
                                    {
                                        $and: [
                                            { $eq: ['$user_id', '$$otherUserId'] },
                                            { $eq: ['$blocked_by', '$$userId'] }
                                        ]
                                    },
                                    {
                                        $and: [
                                            { $eq: ['$user_id', '$$userId'] },
                                            { $eq: ['$blocked_by', '$$otherUserId'] }
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                ],
                as: 'blockListEntry'
            }
        },
        {
            $match: {
                'blockListEntry': { $size: 0 }
            }
        },
        {
            $lookup: {
                from: 'messages',
                let: { conversationId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $eq: ["$conversation_id", "$$conversationId"]
                            }
                        }
                    },
                    {
                        $sort: { createdAt: -1 }
                    },
                    {
                        $group: {
                            _id: null,
                            unseenCount: {
                                $sum: {
                                    $cond: [
                                        { $and: [{ $eq: ["$to", userId] }, { $ne: ["$status", "SEEN"] }] },
                                        1,
                                        0
                                    ]
                                }
                            }
                        }
                    }
                ],
                as: 'unseenMessages'
            }
        },
        {
            $addFields: {
                unseenCount: {
                    $ifNull: [{ $arrayElemAt: ['$unseenMessages.unseenCount', 0] }, 0]
                }
            }
        },
        {
            $lookup: {
                from: 'messages',
                localField: 'latestMessage',
                foreignField: '_id',
                as: 'latestMessage'
            }
        },
        {
            $unwind: {
                path: '$latestMessage',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'otherParticipantId',
                foreignField: '_id',
                as: 'user'
            }
        },
        {
            $unwind: {
                path: '$user',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                _id: 1,
                latestMessage: '$latestMessage.message',
                updatedAt: 1,
                unseenCount: 1,
                user: {
                    _id: '$user._id',
                    displayName: '$user.displayName',
                    profile_picture: '$user.profile_picture'
                }
            }
        },
        { $sort: { updatedAt: -1 } }
    ]);

    res.send(createResponse({ users: conversations }));
};



export const sendMessage = async (req: Request, res: Response) => {
    const { to, message } = req.body;
    const from = req.user?._id;

    if (!from) {
        throw createHttpError(401, 'User not authenticated');
    }

    const existingConversations = await Conversation.find({
        participants: { $all: [from, to] },
    });

    const validConversations = existingConversations.filter(convo => !convo.isDeleted);

    let conversation = validConversations.length > 0 ? validConversations[0] : null;

    if (!conversation) {
        conversation = await Conversation.create({ participants: [from, to], latestMessage: null });
    }

    const newMessage = await Message.create({
        from,
        to,
        message,
        conversation_id: new mongoose.Types.ObjectId(conversation._id),
        status: MessageStatus.DELIEVERED,
    });

    conversation.latestMessage = new mongoose.Types.ObjectId(newMessage._id);
    conversation.messages.push(new mongoose.Types.ObjectId(newMessage._id));
    await conversation.save();

    const responseMessage = {
        _id: newMessage._id,
        text: message,
        createdAt: newMessage.createdAt,
        user: {
            _id: from,
            name: req.user?.username || 'Unknown',
            avatar: req.user?.profile_picture || 'https://placeimg.com/140/140/any',
        },
    };

    res.send(createResponse({ response: 'Message sent successfully', conversationId: conversation._id, messages: [responseMessage] }));
};

export const getMessages = async (req: Request, res: Response) => {
    const conversation_id = req.params.id;
    const page = parseInt(req.query.page as string) || 1;

    const count = await Message.countDocuments({ conversation_id });
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ conversation_id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec();

    const formattedMessages = messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    res.send(createResponse({ messages: formattedMessages, count }));
}

export const deleteConversation = async (req: Request, res: Response) => {
    const conversationId = req.params.id;

    await Conversation.findById(conversationId);

    const options = { validateBeforeSave: false };
    await Conversation.softDelete({ _id: conversationId }, options);
    res.send(createResponse({ message: 'Conversation soft deleted successfully' }));
};

export const searchUser = async (req: Request, res: Response) => {
    const role = req.user?.lastActiveRole;
    const userId = req.user?._id;
    const searchString = req.query.searchString as string;

    if (!userId) {
        throw createHttpError(401, 'User is not authenticated');
    }
    const blockedByMe = await BlockList.find({ blocked_by: userId }).distinct('user_id');
    const blockedMe = await BlockList.find({ user_id: userId }).distinct('blocked_by');

    const searchQuery = searchString
        ? {
            $or: [
                { displayName: { $regex: new RegExp(searchString, 'i') } },
                { username: { $regex: new RegExp(searchString, 'i') } },
            ],
        }
        : {};

    const fieldsToSelect = 'displayName _id username profile_picture';
    let users;

    if (role === 'CREATOR') {
        users = await User.find({
            isFan: true,
            _id: { $nin: [userId, ...blockedByMe, ...blockedMe] },
            ...searchQuery,
        })
            .select(fieldsToSelect)
            .limit(10);
    } else if (role === 'FAN') {
        users = await User.find({
            isCreator: true,
            _id: { $nin: [userId, ...blockedByMe, ...blockedMe] },
            ...searchQuery,
        })
            .select(fieldsToSelect)
            .limit(10);
    } else {
        throw createHttpError(400, 'Invalid user role');
    }

    res.send(createResponse({ user: users }));
};

export const unseenCount = async (req: Request, res: Response) => {
    const userId = req.user?._id;

    if (!userId) {
        throw createHttpError(401, 'User not authenticated');
    }

    const conversations = await Conversation.find({
        participants: userId,
        isDeleted: { $ne: true }
    }).select('_id');
    const conversationIds = conversations.map(convo => convo._id);

    const unseenMessages = await Message.aggregate([
        {
            $match: {
                conversation_id: { $in: conversationIds },
                to: new mongoose.Types.ObjectId(userId),
                status: MessageStatus.DELIEVERED
            },
        },
        {
            $group: {
                _id: null,
                totalUnseenCount: { $sum: 1 },
            },
        },
    ]);

    const totalUnseenCount = unseenMessages.length > 0 ? unseenMessages[0].totalUnseenCount : 0;

    res.send(createResponse({ unseenCount: totalUnseenCount }));
};