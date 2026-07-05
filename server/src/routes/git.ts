import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requireProject } from '../middleware/projectAccess.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import * as gitService from '../services/gitService.js';
import { recordActivity } from '../services/activity.js';
import { flushProjectDocs } from '../services/collab.js';

export const gitRouter = Router({ mergeParams: true });
gitRouter.use(requireAuth);

gitRouter.get(
  '/status',
  requireProject('viewer'),
  asyncHandler(async (req, res) => {
    const projectId = String(req.project!._id);
    if (!(await gitService.isRepo(projectId))) {
      return res.json({ initialized: false });
    }
    // Make sure live collaborative edits are on disk before git looks at it.
    await flushProjectDocs(projectId);
    res.json({ initialized: true, ...(await gitService.gitStatus(projectId)) });
  })
);

gitRouter.post(
  '/init',
  requireProject('editor'),
  asyncHandler(async (req, res) => {
    await gitService.initRepo(String(req.project!._id));
    res.json({ ok: true });
  })
);

gitRouter.post(
  '/stage',
  requireProject('editor'),
  validate(z.object({ paths: z.array(z.string()).default([]) })),
  asyncHandler(async (req, res) => {
    await flushProjectDocs(String(req.project!._id));
    await gitService.stageFiles(String(req.project!._id), req.body.paths);
    res.json({ ok: true });
  })
);

gitRouter.post(
  '/unstage',
  requireProject('editor'),
  validate(z.object({ paths: z.array(z.string()).default([]) })),
  asyncHandler(async (req, res) => {
    await gitService.unstageFiles(String(req.project!._id), req.body.paths);
    res.json({ ok: true });
  })
);

gitRouter.post(
  '/discard',
  requireProject('editor'),
  validate(z.object({ paths: z.array(z.string()).min(1) })),
  asyncHandler(async (req, res) => {
    await gitService.discardChanges(String(req.project!._id), req.body.paths);
    res.json({ ok: true });
  })
);

gitRouter.post(
  '/commit',
  requireProject('editor'),
  validate(z.object({ message: z.string().min(1).max(2000) })),
  asyncHandler(async (req, res) => {
    const result = await gitService.commit(
      String(req.project!._id),
      req.body.message,
      req.auth!.name,
      req.auth!.email
    );
    if (!result.hash) throw ApiError.badRequest('Nothing to commit — stage some changes first');
    await recordActivity(req.auth!.sub, 'git.commit', req.body.message.split('\n')[0], String(req.project!._id));
    res.json(result);
  })
);

gitRouter.post(
  '/push',
  requireProject('editor'),
  asyncHandler(async (req, res) => {
    try {
      await gitService.push(String(req.project!._id));
      res.json({ ok: true });
    } catch (err) {
      throw ApiError.badRequest(`Push failed: ${(err as Error).message.split('\n')[0]}`);
    }
  })
);

gitRouter.post(
  '/pull',
  requireProject('editor'),
  asyncHandler(async (req, res) => {
    try {
      const result = await gitService.pull(String(req.project!._id));
      res.json({ ok: true, summary: result.summary });
    } catch (err) {
      throw ApiError.badRequest(`Pull failed: ${(err as Error).message.split('\n')[0]}`);
    }
  })
);

gitRouter.get(
  '/branches',
  requireProject('viewer'),
  asyncHandler(async (req, res) => {
    res.json(await gitService.listBranches(String(req.project!._id)));
  })
);

gitRouter.post(
  '/checkout',
  requireProject('editor'),
  validate(z.object({ branch: z.string().min(1), create: z.boolean().default(false) })),
  asyncHandler(async (req, res) => {
    try {
      await gitService.checkoutBranch(String(req.project!._id), req.body.branch, req.body.create);
      res.json({ ok: true });
    } catch (err) {
      throw ApiError.badRequest(`Checkout failed: ${(err as Error).message.split('\n')[0]}`);
    }
  })
);

gitRouter.get(
  '/log',
  requireProject('viewer'),
  asyncHandler(async (req, res) => {
    res.json(await gitService.log(String(req.project!._id), Number(req.query.limit) || 50));
  })
);

gitRouter.get(
  '/diff',
  requireProject('viewer'),
  asyncHandler(async (req, res) => {
    const filePath = String(req.query.path || '');
    if (!filePath) throw ApiError.badRequest('path is required');
    const [diff, headContent] = await Promise.all([
      gitService.diffFile(String(req.project!._id), filePath, req.query.staged === '1'),
      gitService.showHead(String(req.project!._id), filePath),
    ]);
    res.json({ diff, headContent });
  })
);
