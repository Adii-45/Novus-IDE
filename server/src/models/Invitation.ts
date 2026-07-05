import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IInvitation extends Document {
  project: Types.ObjectId;
  email: string;
  role: 'editor' | 'viewer';
  invitedBy: Types.ObjectId;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
}

const invitationSchema = new Schema<IInvitation>(
  {
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    email: { type: String, required: true, lowercase: true, index: true },
    role: { type: String, enum: ['editor', 'viewer'], default: 'editor' },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  },
  { timestamps: true }
);

export const Invitation = mongoose.model<IInvitation>('Invitation', invitationSchema);
