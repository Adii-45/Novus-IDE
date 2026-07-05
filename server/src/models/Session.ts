import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface ISession extends Document {
  user: Types.ObjectId;
  refreshTokenHash: string;
  userAgent: string;
  ip: string;
  lastActiveAt: Date;
  expiresAt: Date;
  createdAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    refreshTokenHash: { type: String, required: true, index: true },
    userAgent: { type: String, default: '' },
    ip: { type: String, default: '' },
    lastActiveAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = mongoose.model<ISession>('Session', sessionSchema);
