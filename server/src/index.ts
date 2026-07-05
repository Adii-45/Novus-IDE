import express from 'express';
import http from 'node:http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import fs from 'node:fs/promises';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { projectsRouter } from './routes/projects.js';
import { filesRouter } from './routes/files.js';
import { containersRouter } from './routes/containers.js';
import { gitRouter } from './routes/git.js';
import { chatRouter } from './routes/chat.js';
import { notificationsRouter } from './routes/notifications.js';
import { activityRouter } from './routes/activity.js';
import { registerSockets } from './sockets/index.js';
import { isDockerAvailable } from './services/docker.js';

async function main() {
  await fs.mkdir(config.workspacesRoot, { recursive: true });
  await fs.mkdir(config.uploadsTmp, { recursive: true });

  await mongoose.connect(config.mongoUri);
  logger.info(`MongoDB connected (${config.mongoUri})`);

  const app = express();
  app.set('trust proxy', 1);
  app.use(cors({ origin: config.clientUrl, credentials: true }));
  app.use(express.json({ limit: '5mb' }));
  app.use(cookieParser());

  app.get('/api/health', async (_req, res) => {
    res.json({
      status: 'ok',
      docker: await isDockerAvailable(),
      uptime: Math.round(process.uptime()),
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/projects/:projectId/files', filesRouter);
  app.use('/api/projects/:projectId/container', containersRouter);
  app.use('/api/projects/:projectId/git', gitRouter);
  app.use('/api/projects/:projectId/chat', chatRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/activity', activityRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: config.clientUrl, credentials: true },
    maxHttpBufferSize: 2 * 1024 * 1024,
  });
  registerSockets(io);

  server.listen(config.port, () => {
    logger.info(`NovusIDE server listening on http://localhost:${config.port}`);
    void isDockerAvailable().then((ok) =>
      logger.info(ok ? 'Docker runtime available ✓' : 'Docker runtime unavailable — degraded mode')
    );
  });
}

main().catch((err) => {
  logger.error('Fatal startup error', err);
  process.exit(1);
});
