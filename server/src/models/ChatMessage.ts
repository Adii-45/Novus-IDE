import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IChatMessage extends Document {
  project: Types.ObjectId;
  author: Types.ObjectId;
  body: string;
  mentions: Types.ObjectId[];
  attachment?: { path: string; name: string };
  createdAt: Date;
}

const chatMessageSchema = new Schema<IChatMessage>(
  {
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, maxlength: 4000 },
    mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    attachment: { path: String, name: String },
  },
  { timestamps: true }
);

chatMessageSchema.index({ project: 1, createdAt: -1 });

export const ChatMessage = mongoose.model<IChatMessage>('ChatMessage', chatMessageSchema);
