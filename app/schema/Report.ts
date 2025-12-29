import mongoose, { Mongoose, Types } from "mongoose";
import { type BaseSchema } from "./index";
import { ISubscription } from "./Subscription";
import { IUser } from "./User";

const Schema = mongoose.Schema;

export interface IReports extends BaseSchema {
    user_id: Types.ObjectId | IUser;
    reportedBy: Types.ObjectId | IUser;
    reason: string;
}
const ReportSchema = new Schema<IReports>(
    {
        user_id: { type: Schema.Types.ObjectId, required: true, ref: 'user' },
        reportedBy: { type: Schema.Types.ObjectId, required: true, ref: 'user' },
        reason: { type: String, required: true },
    },
    { timestamps: true }
);

export default mongoose.model<IReports>("report", ReportSchema);
