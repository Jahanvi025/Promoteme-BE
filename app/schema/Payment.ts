import mongoose, { Types } from "mongoose";
import { type BaseSchema } from "./index";
import { IUser } from "./User";

const Schema = mongoose.Schema;

export enum PaymentStatus {
    PENDING = "PENDING",
    DONE = "DONE",
    FAILED = "FAILED",
}

export interface IPayment extends BaseSchema {
    user_id: Types.ObjectId | IUser;
    amount: number;
    status: PaymentStatus;
    description: string;
    paidTo: Types.ObjectId | IUser
    type: string;
    paymentMethod: string;
}

const PaymentSchema = new Schema<IPayment>(
    {
        user_id: { type: Schema.Types.ObjectId, required: true, ref: 'user' },
        amount: { type: Number },
        status: { type: String, enum: PaymentStatus, required: true, default: PaymentStatus.PENDING },
        description: { type: String },
        paidTo: { type: Schema.Types.ObjectId, required: true, ref: "user" },
        type: { type: String, required: true },
        paymentMethod: { type: String, required: true }
    },
    { timestamps: true }
);

export default mongoose.model<IPayment>("payment", PaymentSchema);
