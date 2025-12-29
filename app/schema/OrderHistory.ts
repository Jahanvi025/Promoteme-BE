import mongoose, { Mongoose, Types } from "mongoose";
import { type BaseSchema } from "./index";
import { IProduct } from "./Product";
import { IAddress } from "./Address";
import { IUser } from "./User";

export enum OrderStatus {
  PROCESSING = "PROCESSING",
  SHIPPING = "SHIPPING",
  DELIVERED = "DELIVERED",
  REFUNDED = "REFUNDED"
}
const Schema = mongoose.Schema;

export interface IOrderHistory extends BaseSchema {
  product_id: [Types.ObjectId | IProduct];
  status: OrderStatus;
  quantity: number;
  unit_price: number;
  total_price: number;
  address_id: Types.ObjectId | IAddress;
  ordered_by: Types.ObjectId | IUser
  owner_id: Types.ObjectId | IUser
}

const OrderHistorySchema = new Schema<IOrderHistory>(
  {
    product_id: [{ type: Schema.Types.ObjectId, required: true, ref: "product" }],
    status: {
      type: String, enum: OrderStatus, required: true, default: OrderStatus.PROCESSING
    },
    quantity: { type: Number, required: true },
    unit_price: { type: Number, required: true },
    total_price: { type: Number, required: true },
    address_id: { type: Schema.Types.ObjectId, required: true, ref: 'address' },
    ordered_by: { type: Schema.Types.ObjectId, required: true, ref: 'user' },
    owner_id: { type: Schema.Types.ObjectId, required: true, ref: 'user' }
  },
  { timestamps: true }
);

export default mongoose.model<IOrderHistory>("orderHistory", OrderHistorySchema);
