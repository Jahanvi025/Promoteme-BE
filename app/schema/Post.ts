import mongoose, { Mongoose, Types } from "mongoose";
import { type BaseSchema } from "./index";
import { IUser } from "./User";

export enum PostType {
  TEXT = "TEXT",
  IMAGE = "IMAGE",
  AUDIO = "AUDIO",
  VIDEO = "VIDEO"
}

export enum AccessIdentifier {
  SUBSCRIPTION = "SUBSCRIPTION",
  PAID = "PAID",
  FREE = "FREE"
}

export enum PostStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE"
}

const Schema = mongoose.Schema;

export interface IPost extends BaseSchema {
  user_id: mongoose.Types.ObjectId | IUser;
  type: PostType;
  access_identifier: AccessIdentifier,
  likes: number;
  comments: number;
  description: string;
  thumbnail_url: string;
  teaser_url: string;
  tip: number;
  pollquestion: string;
  pollanswers: string[];
  video_url: string;
  audio_url: string;
  images: string[];
  status: PostStatus;
  price: string;
  likedBy: mongoose.Types.ObjectId[];
  bookMarkedBy: mongoose.Types.ObjectId[];
  purchasedBy: mongoose.Types.ObjectId[];
}

const PostSchema = new Schema<IPost>(
  {
    user_id: { type: mongoose.Types.ObjectId, required: true, ref: 'user' },
    type: { type: String, enum: PostType, required: true },
    access_identifier: { type: String, enum: AccessIdentifier, required: true },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    description: { type: String },
    thumbnail_url: { type: String },
    teaser_url: { type: String },
    tip: { type: Number, default: 0 },
    pollquestion: { type: String },
    pollanswers: [{ type: String }],
    video_url: { type: String },
    audio_url: { type: String },
    images: [{ type: String }],
    status: { type: String, enum: PostStatus, default: PostStatus.ACTIVE },
    price: { type: String },
    likedBy: [{ type: Schema.Types.ObjectId, ref: 'user', default: [], required: "true" }],
    bookMarkedBy: [{ type: Schema.Types.ObjectId, ref: 'user', default: [], required: "true" }],
    purchasedBy: [{ type: Schema.Types.ObjectId, ref: 'user', default: [], required: "true" }],
  },
  { timestamps: true }
);

export default mongoose.model<IPost>("post", PostSchema);
