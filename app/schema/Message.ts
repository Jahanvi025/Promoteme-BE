import mongoose, { Mongoose, Types } from "mongoose";
import { type BaseSchema } from "./index";
import { IUser } from "./User";
import { IConversation } from './Conversation'
export enum MessageStatus {
  DELIEVERED = "DELIEVERED",
  SEEN = "SEEN",
  UNDELIEVERED = "UNDELIEVERED"
}

const Schema = mongoose.Schema;

export interface IMessage extends BaseSchema {
  from: Types.ObjectId;
  message: string;
  deleted_at: Date;
  deleted_by: string;
  to: Types.ObjectId;
  status: MessageStatus;
  images: string[];
  video: string;
  conversation_id: Types.ObjectId | IConversation
}

const MessageSchema = new Schema<IMessage>(
  {
    from: { type: Schema.Types.ObjectId, required: true, ref: 'user' },
    message: { type: String, required: true },
    deleted_at: { type: Date },
    deleted_by: { type: String },
    to: { type: Schema.Types.ObjectId, required: true, ref: 'user' },
    status: { type: String, enum: MessageStatus, required: true },
    images: [{ type: String }],
    video: { type: String },
    conversation_id: { type: Schema.Types.ObjectId, ref: "conversation" }
  },
  { timestamps: true }
);

export default mongoose.model<IMessage>("message", MessageSchema);
