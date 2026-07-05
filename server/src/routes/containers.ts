import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireProject } from '../middleware/projectAccess.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  startContainer,
  stopContainer,
  restartContainer,
  destroyContainer,
  getContainerStatus,
  getContainerStats,
  getContainerLogs,
  getPortMap,
  isDockerAvailable,
} from '../services/docker.js';
import { killProjectTerminals } from '../services/terminal.js';
import { recordActivity } from '../services/activity.js';

export const containersRouter = Router({ mergeParams: true });
containersRouter.use(requireAuth);

containersRouter.get(
  '/status',
  requireProject('viewer'),
  asyncHandler(async (req, res) => {
    const status = await getContainerStatus(req.project!);
    res.json({
      ...status,
      dockerAvailable: await isDockerAvailable(),
      portMap: getPortMap(req.project!),
    });
  })
);

containersRouter.post(
  '/start',
  requireProject('editor'),
  asyncHandler(async (req, res) => {
    const status = await startContainer(req.project!);
    await recordActivity(req.auth!.sub, 'container.started', req.project!.name, String(req.project!._id));
    res.json({ ...status, portMap: getPortMap(req.project!) });
  })
);

containersRouter.post(
  '/stop',
  requireProject('editor'),
  asyncHandler(async (req, res) => {
    killProjectTerminals(String(req.project!._id));
    await stopContainer(req.project!);
    res.json(await getContainerStatus(req.project!));
  })
);

containersRouter.post(
  '/restart',
  requireProject('editor'),
  asyncHandler(async (req, res) => {
    killProjectTerminals(String(req.project!._id));
    const status = await restartContainer(req.project!);
    res.json({ ...status, portMap: getPortMap(req.project!) });
  })
);

containersRouter.post(
  '/destroy',
  requireProject('owner'),
  asyncHandler(async (req, res) => {
    killProjectTerminals(String(req.project!._id));
    await destroyContainer(req.project!);
    res.json({ ok: true });
  })
);

containersRouter.get(
  '/stats',
  requireProject('viewer'),
  asyncHandler(async (req, res) => {
    res.json(await getContainerStats(req.project!));
  })
);

containersRouter.get(
  '/logs',
  requireProject('viewer'),
  asyncHandler(async (req, res) => {
    res.json({ logs: await getContainerLogs(req.project!, Number(req.query.tail) || 200) });
  })
);
