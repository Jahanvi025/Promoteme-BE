import mongoose, { Types } from "mongoose";
import { type BaseSchema } from "./index";
import { IUser } from "./User";

const Schema = mongoose.Schema;

export interface IPaymentCard extends BaseSchema {
  user_id: Types.ObjectId | IUser;
  name: string;
  number: string;
  expiryDate: string;
  CVV: number;
  type: string;
  isDefault: boolean;
}

const PaymentCardSchema = new Schema<IPaymentCard>(
  {
    user_id: { type: Schema.Types.ObjectId, required: true, ref: "user" },
    name: { type: String, required: true },
    number: { type: String, required: true },
    expiryDate: { type: String, required: true },
    CVV: { type: Number, required: true },
    type: { type: String, required: true },
    isDefault: { type: Boolean, required: true, default: false }
  },
  { timestamps: true }
);

export default mongoose.model<IPaymentCard>("PaymentCard", PaymentCardSchema);
