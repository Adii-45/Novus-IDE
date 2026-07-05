import mongoose, { Schema, type Document } from 'mongoose';

export interface EditorSettings {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  formatOnSave: boolean;
  autoSave: boolean;
  theme: string;
}

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash?: string;
  avatarColor: string;
  bio: string;
  emailVerified: boolean;
  verifyToken?: string;
  verifyTokenExpires?: Date;
  resetToken?: string;
  resetTokenExpires?: Date;
  oauth: {
    github?: { id: string; username: string };
    google?: { id: string; email: string };
  };
  settings: {
    editor: EditorSettings;
    notifications: {
      mentions: boolean;
      invites: boolean;
      projectActivity: boolean;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const AVATAR_COLORS = ['#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#F43F5E'];

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String },
    avatarColor: {
      type: String,
      default: () => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    },
    bio: { type: String, default: '', maxlength: 240 },
    emailVerified: { type: Boolean, default: false },
    verifyToken: String,
    verifyTokenExpires: Date,
    resetToken: String,
    resetTokenExpires: Date,
    oauth: {
      github: { id: String, username: String },
      google: { id: String, email: String },
    },
    settings: {
      editor: {
        fontSize: { type: Number, default: 13 },
        tabSize: { type: Number, default: 2 },
        wordWrap: { type: Boolean, default: false },
        minimap: { type: Boolean, default: true },
        formatOnSave: { type: Boolean, default: false },
        autoSave: { type: Boolean, default: true },
        theme: { type: String, default: 'novus-dark' },
      },
      notifications: {
        mentions: { type: Boolean, default: true },
        invites: { type: Boolean, default: true },
        projectActivity: { type: Boolean, default: true },
      },
    },
  },
  { timestamps: true }
);

export function publicUser(u: IUser) {
  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    avatarColor: u.avatarColor,
    bio: u.bio,
    emailVerified: u.emailVerified,
    settings: u.settings,
    connected: {
      github: Boolean(u.oauth?.github?.id),
      google: Boolean(u.oauth?.google?.id),
    },
    createdAt: u.createdAt,
  };
}

export const User = mongoose.model<IUser>('User', userSchema);
