import mongoose, { Mongoose, Types } from "mongoose";
import { type BaseSchema } from "./index";
import { IPost } from "./Post";
import { IUser } from "./User";

const Schema = mongoose.Schema;

export interface IComment extends BaseSchema {
  post_id: mongoose.Types.ObjectId | IPost;
  user_id: mongoose.Types.ObjectId | IUser;
  comment: string;
  parent_id: mongoose.Types.ObjectId | null;
  likes: number
  likedBy: mongoose.Types.ObjectId[]
}

const CommentSchema = new Schema<IComment>(
  {
    post_id: { type: Schema.Types.ObjectId, required: true, ref: 'post' },
    user_id: { type: Schema.Types.ObjectId, required: true, ref: 'user' },
    comment: { type: String, required: true },
    parent_id: { type: Schema.Types.ObjectId, ref: "comment", default: null },
    likes: { type: Number, default: 0 },
    likedBy: [{ type: Schema.Types.ObjectId, ref: 'user', default: [] }],
  },
  { timestamps: true }
);

export default mongoose.model<IComment>("comment", CommentSchema);
