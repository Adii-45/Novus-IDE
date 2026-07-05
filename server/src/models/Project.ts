import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type ProjectRole = 'owner' | 'editor' | 'viewer';

export interface IProjectMember {
  user: Types.ObjectId;
  role: ProjectRole;
  addedAt: Date;
}

export interface IProject extends Document {
  name: string;
  description: string;
  template: string;
  owner: Types.ObjectId;
  members: IProjectMember[];
  starredBy: Types.ObjectId[];
  pinnedBy: Types.ObjectId[];
  archived: boolean;
  containerId?: string;
  previewPort?: number; // host port mapped to the container preview port
  portMap?: Record<string, number>; // containerPort -> hostPort
  gitRepoUrl?: string;
  lastOpenedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: '', maxlength: 300 },
    template: { type: String, default: 'blank' },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    members: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['owner', 'editor', 'viewer'], default: 'editor' },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    starredBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    pinnedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    archived: { type: Boolean, default: false },
    containerId: String,
    previewPort: Number,
    portMap: { type: Schema.Types.Mixed, default: {} },
    gitRepoUrl: String,
    lastOpenedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

projectSchema.index({ 'members.user': 1 });

export function memberRole(project: IProject, userId: string): ProjectRole | null {
  if (String(project.owner) === userId) return 'owner';
  const m = project.members.find((m) => String(m.user) === userId);
  return m ? m.role : null;
}

export const Project = mongoose.model<IProject>('Project', projectSchema);
