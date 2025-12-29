import mongoose, { Types } from "mongoose";
import { type BaseSchema } from "./index";
import { IUser } from "./User";
import { IWallet } from "./Wallet";

const Schema = mongoose.Schema;

export enum TransactionType {
    DEPOSIT = "DEPOSIT",
    PAYMENT = "PAYMENT",
}

export enum TransactionStatus {
    PENDING = "PENDING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
}

export interface ITransaction extends BaseSchema {
    user_id: Types.ObjectId | IUser;
    wallet_id: Types.ObjectId | IWallet;
    type: TransactionType;
    amount: number;
    status: TransactionStatus;
    description: string;
    paidTo: Types.ObjectId | IUser;
}

const TransactionSchema = new Schema<ITransaction>(
    {
        user_id: { type: Schema.Types.ObjectId, required: true, ref: 'user' },
        wallet_id: { type: Schema.Types.ObjectId, required: true, ref: "wallet" },
        type: { type: String, enum: TransactionType, required: true },
        amount: { type: Number, required: true },
        status: { type: String, enum: TransactionStatus, required: true, default: TransactionStatus.PENDING },
        description: { type: String },
        paidTo: { type: Schema.Types.ObjectId, required: true, ref: "user" },
    },
    { timestamps: true }
);

export default mongoose.model<ITransaction>("transaction", TransactionSchema);
