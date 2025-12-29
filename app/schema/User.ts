import mongoose, { Mongoose, Types } from "mongoose";
import { type BaseSchema } from "./index";
import bcrypt from "bcrypt";
import { hashPassword } from "../services/user";
import { ICategory } from './Category';
import { IPost } from "./Post";

export enum LastActiveRole {
  CREATOR = "CREATOR",
  FAN = "FAN",
  ADMIN = "ADMIN",
}

export enum Provider {
  FACEBOOK = "facebook",
  GOOGLE = "google",
  LINKEDIN = "linkedin",
}

const Schema = mongoose.Schema;

export interface IUser extends BaseSchema {
  email: string;
  active: boolean;
  isCreator: boolean;
  isFan: boolean;
  password: string;
  blocked: boolean;
  lastActiveRole: LastActiveRole;
  provider: Provider;
  providerId: string;
  username: string;
  firstName: string;
  lastName: string;
  displayName: string;
  profile_picture: string;
  facebook_url: string;
  linkedin_url: string;
  instagram_url: string;
  facebook_picture: string;
  linkedin_picture: string;
  gender: string;
  bio: string;
  category_id: mongoose.Types.ObjectId | ICategory;
  date_of_birth: Date;
  government_id: string[];
  cover_image: string;
  intro_video: string;
  total_subscribers: number;
  mobile_number: string;
  otp: number;
  otp_expiration: number,
  monthly_Price: number;
  yearly_Price: number;
  stripeAccount_id: string;
  notInterestedPosts: (Types.ObjectId | IPost)[];
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    active: { type: Boolean, default: false },
    isCreator: { type: Boolean, default: false },
    isFan: { type: Boolean, default: false },
    blocked: { type: Boolean, default: false },
    password: { type: String, required: true },
    lastActiveRole: { type: String, enum: LastActiveRole, default: LastActiveRole.CREATOR },
    provider: { type: String, enum: Provider },
    providerId: { type: String },
    username: { type: String, required: true, unique: true },
    firstName: { type: String, },
    lastName: { type: String, },
    displayName: { type: String },
    profile_picture: { type: String },
    facebook_url: { type: String, },
    linkedin_url: { type: String },
    instagram_url: { type: String },
    facebook_picture: { type: String },
    linkedin_picture: { type: String },
    gender: { type: String },
    bio: { type: String },
    category_id: { type: String, ref: "category" },
    date_of_birth: { type: Date },
    government_id: [{ type: String }],
    cover_image: { type: String },
    intro_video: { type: String },
    total_subscribers: { type: Number, required: true, default: 0 },
    monthly_Price: { type: Number, required: true, default: 9 },
    yearly_Price: { type: Number, required: true, default: 99 },
    mobile_number: { type: String, required: true, maxlength: 10 },
    otp: { type: Number },
    otp_expiration: { type: Number },
    stripeAccount_id: { type: String },
    notInterestedPosts: [{ type: Schema.Types.ObjectId, ref: 'post' }]
  },
  { timestamps: true }
);

// save hashed password
UserSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await hashPassword(this.password);
  }
  next();
});

export default mongoose.model<IUser>("user", UserSchema);
