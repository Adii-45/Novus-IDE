import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: Number(process.env.PORT || 4000),
  isProd: process.env.NODE_ENV === 'production',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27018/novuside',

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'novus-dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'novus-dev-refresh-secret',
    accessTtl: process.env.ACCESS_TOKEN_TTL || '15m',
    refreshTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30),
  },

  docker: {
    runtimeImage: process.env.RUNTIME_IMAGE || 'novuside-runtime',
    memoryMb: Number(process.env.CONTAINER_MEMORY_MB || 1024),
    cpus: Number(process.env.CONTAINER_CPUS || 1),
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'NovusIDE <no-reply@novuside.dev>',
  },

  oauth: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
  },

  // Root for all project workspaces on the host filesystem.
  workspacesRoot: path.resolve(__dirname, '../data/workspaces'),
  uploadsTmp: path.resolve(__dirname, '../data/uploads'),
  templatesRoot: path.resolve(__dirname, '../templates'),
};
