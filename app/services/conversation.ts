import Conversation from "../schema/Conversation";
import Message, { MessageStatus } from "../schema/Message";
import mongoose, { Types } from "mongoose";

interface IMessageInput {
    from?: string | undefined;
    message: string;
    to: string;
    status: string;
    images?: string[];
    conversation_id: string;
}

export const markMessagesAsSeen = async (conversationId: Types.ObjectId, userId: string): Promise<void> => {
    await Message.updateMany(
        {
            conversation_id: conversationId,
            to: userId,
            status: MessageStatus.DELIEVERED
        },
        { $set: { status: MessageStatus.SEEN } }
    );
};

export const sendMessage = async ({
    from,
    to,
    message,
}: IMessageInput): Promise<void> => {
    const existingConversations = await Conversation.find({
        participants: { $all: [from, to] },
    });

    const validConversations = existingConversations.filter(convo => !convo.isDeleted);

    let conversation = validConversations.length > 0 ? validConversations[0] : null;

    if (!conversation) {
        conversation = await Conversation.create({ participants: [from, to], latestMessage: null });
    }

    const newMessage = await Message.create({
        from: new mongoose.Types.ObjectId(from),
        to: new mongoose.Types.ObjectId(to),
        message,
        conversation_id: new mongoose.Types.ObjectId(conversation._id),
        status: MessageStatus.DELIEVERED,
    });

    conversation.latestMessage = new mongoose.Types.ObjectId(newMessage._id);
    conversation.messages.push(new mongoose.Types.ObjectId(newMessage._id));
    await conversation.save();

};
