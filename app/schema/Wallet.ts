import mongoose, { Types } from "mongoose";
import { type BaseSchema } from "./index";
import { IUser } from "./User";

const Schema = mongoose.Schema;

export interface IWallet extends BaseSchema {
    user_id: Types.ObjectId | IUser;
    balance: number;
}

const WalletSchema = new Schema<IWallet>(
    {
        user_id: { type: Schema.Types.ObjectId, required: true, ref: "user" },
        balance: { type: Number, required: true, default: 0 },
    },
    { timestamps: true }
);

export default mongoose.model<IWallet>("wallet", WalletSchema);
