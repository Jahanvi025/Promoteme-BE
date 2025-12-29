import mongoose, { Mongoose, Types } from "mongoose";
import { type BaseSchema } from "./index";
import { IUser } from "./User";

export enum RequestStatus{
    ACTIVE = "ACTIVE",
    PENDING = "PENDING"
}
const Schema = mongoose.Schema;

export interface IPayout extends BaseSchema {
    status: RequestStatus;
    payment_gateway: string;
    note : string;
    user_id: Types.ObjectId | IUser
}

const PayoutRequestSchema = new Schema<IPayout>(
  {
    status: {type: String, enum: RequestStatus, required: true, default:RequestStatus.PENDING},
    payment_gateway: {type: String,required: true},
    note: { type: String},
    user_id: { type: Schema.Types.ObjectId, required: true, ref:'user'}
  },
  { timestamps: true }
);

export default mongoose.model<IPayout>("category", PayoutRequestSchema);
