export interface User {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  bio: string;
  emailVerified: boolean;
  settings: {
    editor: EditorSettings;
    notifications: { mentions: boolean; invites: boolean; projectActivity: boolean };
  };
  connected: { github: boolean; google: boolean };
  createdAt: string;
}

export interface EditorSettings {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  formatOnSave: boolean;
  autoSave: boolean;
  theme: string;
}

export type ProjectRole = 'owner' | 'editor' | 'viewer';

export interface ProjectMember {
  id: string;
  name?: string;
  email?: string;
  avatarColor?: string;
  role: ProjectRole;
  addedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  template: string;
  owner: { id: string; name?: string; avatarColor?: string };
  role: ProjectRole;
  members: ProjectMember[];
  starred: boolean;
  pinned: boolean;
  archived: boolean;
  previewPort?: number;
  gitRepoUrl?: string;
  lastOpenedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  language: string;
  devCommand?: string;
  previewPort?: number;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
  children?: FileNode[];
}

export interface SearchMatch {
  path: string;
  line: number;
  column: number;
  preview: string;
}

export interface ContainerStatus {
  state: 'none' | 'created' | 'running' | 'paused' | 'exited' | 'dead' | 'restarting';
  containerId?: string;
  previewPort?: number;
  startedAt?: string;
  dockerAvailable?: boolean;
  portMap?: Record<string, number>;
}

export interface ContainerStats {
  cpuPercent: number;
  memoryUsedMb: number;
  memoryLimitMb: number;
}

export interface GitStatus {
  initialized: boolean;
  branch?: string;
  ahead?: number;
  behind?: number;
  tracking?: string | null;
  branches?: string[];
  staged?: string[];
  created?: string[];
  modified?: string[];
  deleted?: string[];
  renamed?: string[];
  untracked?: string[];
  conflicted?: string[];
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  email: string;
  date: string;
}

export interface PresenceUser {
  socketId: string;
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  activeFile: string | null;
  typing: boolean;
}

export interface ChatMessage {
  id: string;
  projectId: string;
  author: { id: string; name: string; avatarColor: string };
  body: string;
  mentions: string[];
  createdAt: string;
}

export interface AppNotification {
  id: string;
  type: 'mention' | 'invite' | 'member_joined' | 'project' | 'system';
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  action: string;
  detail: string;
  projectId: string | null;
  projectName: string | null;
  actor: { id: string; name: string; avatarColor: string };
  createdAt: string;
}

export interface UserSession {
  id: string;
  userAgent: string;
  ip: string;
  lastActiveAt: string;
  createdAt: string;
  current: boolean;
}
