import mongoose, { Mongoose, Types } from "mongoose";
import { type BaseSchema } from "./index";
import { IUser } from "./User";

const Schema = mongoose.Schema;

export enum ProductType {
  DIGITAL = "DIGITAL",
  PHYSICAL = "PHYSICAL"
}

export enum ProductStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE"
}

export interface IProduct extends BaseSchema {
  user_id: Types.ObjectId | IUser;
  images: string[];
  name: string;
  price: number;
  stock: number;
  type: ProductType;
  status: ProductStatus;
  description: string;
  bookMarkedBy: mongoose.Types.ObjectId[];

}

const ProductSchema = new Schema<IProduct>(
  {
    user_id: { type: Schema.Types.ObjectId, required: true, ref: 'user' },
    images: [{ type: String, required: true }],
    name: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, required: true },
    type: { type: String, enum: ProductType, required: true },
    status: { type: String, enum: ProductStatus, required: true, default: ProductStatus.ACTIVE },
    description: { type: String },
    bookMarkedBy: [{ type: Schema.Types.ObjectId, ref: 'user', default: [], required: "true" }],
  },
  { timestamps: true }
);

export default mongoose.model<IProduct>("product", ProductSchema);
