import mongoose, { Mongoose, Types } from "mongoose";
import { type BaseSchema } from "./index";
import { IUser } from "./User";

const Schema = mongoose.Schema;

export interface IBlockList extends BaseSchema {
  user_id: Types.ObjectId | IUser;
  blocked_by: Types.ObjectId | IUser
}

const BlockListSchema = new Schema<IBlockList>(
  {
    user_id: { type: Schema.Types.ObjectId, required: true, ref: 'user' },
    blocked_by: { type: Schema.Types.ObjectId, required: true, ref: 'user' }
  },
  { timestamps: true }
);

export default mongoose.model<IBlockList>("blockList", BlockListSchema);
