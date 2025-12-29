import mongoose, { Mongoose, Types } from "mongoose";
import { type BaseSchema } from "./index";
import { IUser } from "./User";

export enum SubscriptionType {
  MONTHLY = "MONTHLY",
  YEARLY = "YEARLY",
  FREE = "FREE"
}

export enum SubscriptionStatus {
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED"
}

const Schema = mongoose.Schema;

export interface ISubscription extends BaseSchema {
  user_id: Types.ObjectId | IUser;
  subscribedTo: Types.ObjectId | IUser;
  type: SubscriptionType;
  startDate: Date;
  expiryDate: Date;
  paymentMethod: string
  status: SubscriptionStatus
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    user_id: { type: Schema.Types.ObjectId, required: true, ref: "user" },
    type: { type: String, enum: SubscriptionType, required: true },
    subscribedTo: { type: Schema.Types.ObjectId, ref: 'user', required: true },
    startDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    paymentMethod: { type: String },
    status: { type: String, enum: SubscriptionStatus, required: true, default: SubscriptionStatus.ACTIVE }
  },
  { timestamps: true }
);

SubscriptionSchema.index({ user_id: 1, subscribedTo: 1 });

export default mongoose.model<ISubscription>("subscription", SubscriptionSchema);
