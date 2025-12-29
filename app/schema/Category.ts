import mongoose, { Mongoose, Types } from "mongoose";
import { type BaseSchema } from "./index";

const Schema = mongoose.Schema;

export interface ICategory extends BaseSchema {
  name: string,
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true }
  },
  { timestamps: true }
);

export default mongoose.model<ICategory>("category", CategorySchema);
