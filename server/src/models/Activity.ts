import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IActivity extends Document {
  project?: Types.ObjectId;
  actor: Types.ObjectId;
  action: string; // e.g. 'project.created', 'file.saved', 'git.commit', 'member.joined'
  detail: string;
  createdAt: Date;
}

const activitySchema = new Schema<IActivity>(
  {
    project: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
    actor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true },
    detail: { type: String, default: '' },
  },
  { timestamps: true }
);

activitySchema.index({ createdAt: -1 });

export const Activity = mongoose.model<IActivity>('Activity', activitySchema);
