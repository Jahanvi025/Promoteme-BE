import mongoose, { Mongoose, Types } from "mongoose";
import { type BaseSchema } from "./index";
import { IUser } from "./User";
import { IMessage } from "./Message";
import { softDeletePlugin, SoftDeleteModel } from 'soft-delete-plugin-mongoose';

const Schema = mongoose.Schema;
export interface IConversation extends mongoose.Document {
    participants: (Types.ObjectId | IUser)[];
    messages: (Types.ObjectId | IMessage)[];
    latestMessage: Types.ObjectId | IMessage;
    isDeleted?: boolean;
}

const conversationSchema = new Schema<IConversation>(
    {
        participants: [
            {
                type: Types.ObjectId,
                ref: {
                    type: String,
                    required: true,
                    enum: ['User', 'Subscriber'],
                },
            },
        ],
        messages: [{ type: Schema.Types.ObjectId, ref: 'message' }],
        latestMessage: { type: Schema.Types.ObjectId, ref: 'message' },
        isDeleted: { type: Boolean, default: false },
    },
    { timestamps: true }
);

conversationSchema.plugin(softDeletePlugin);
export default mongoose.model<IConversation, SoftDeleteModel<IConversation>>('Conversation', conversationSchema);