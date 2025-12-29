import mongoose, { Mongoose, Types } from "mongoose";
import { type BaseSchema } from "./index";
import { IUser } from "./User";

const Schema = mongoose.Schema;

export interface IAddress extends BaseSchema {
  user_id: mongoose.Types.ObjectId | IUser;
  firstName: string;
  lastName: string;
  state: string;
  address: string;
  zipCode: number;
  contactNumber: number;
  active: boolean
}

const AddressSchema = new Schema<IAddress>(
  {
    user_id: { type: Schema.Types.ObjectId, required: true, ref: 'user' },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    state: { type: String, required: true },
    address: { type: String, required: true },
    zipCode: { type: Number, required: true },
    contactNumber: { type: Number, required: true },
    active: { type: Boolean, required: true, default: true }
  },
  { timestamps: true }
);

export default mongoose.model<IAddress>("address", AddressSchema);
