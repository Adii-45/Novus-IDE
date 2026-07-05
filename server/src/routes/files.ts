import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs/promises';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requireProject } from '../middleware/projectAccess.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { safeJoin } from '../utils/paths.js';
import { config } from '../config.js';
import {
  readTree,
  readFileContent,
  writeFileContent,
  createEntry,
  renameEntry,
  copyEntry,
  deleteEntry,
  searchInFiles,
  zipWorkspace,
} from '../services/workspace.js';
import { getIO } from '../sockets/io.js';

export const filesRouter = Router({ mergeParams: true });
filesRouter.use(requireAuth);

const upload = multer({
  dest: config.uploadsTmp,
  limits: { fileSize: 25 * 1024 * 1024, files: 20 },
});

/** Nudge all collaborators in the project room to refetch the file tree. */
function broadcastTreeChange(projectId: string) {
  getIO()?.of('/collab').to(`project:${projectId}`).emit('files:changed');
}

filesRouter.get(
  '/tree',
  requireProject('viewer'),
  asyncHandler(async (req, res) => {
    res.json(await readTree(String(req.project!._id)));
  })
);

filesRouter.get(
  '/content',
  requireProject('viewer'),
  asyncHandler(async (req, res) => {
    const filePath = String(req.query.path || '');
    res.json(await readFileContent(String(req.project!._id), filePath));
  })
);

filesRouter.put(
  '/content',
  requireProject('editor'),
  validate(z.object({ path: z.string().min(1), content: z.string() })),
  asyncHandler(async (req, res) => {
    await writeFileContent(String(req.project!._id), req.body.path, req.body.content);
    res.json({ ok: true });
  })
);

filesRouter.post(
  '/create',
  requireProject('editor'),
  validate(z.object({ path: z.string().min(1), type: z.enum(['file', 'folder']) })),
  asyncHandler(async (req, res) => {
    await createEntry(String(req.project!._id), req.body.path, req.body.type);
    broadcastTreeChange(String(req.project!._id));
    res.status(201).json({ ok: true });
  })
);

filesRouter.post(
  '/rename',
  requireProject('editor'),
  validate(z.object({ from: z.string().min(1), to: z.string().min(1) })),
  asyncHandler(async (req, res) => {
    await renameEntry(String(req.project!._id), req.body.from, req.body.to);
    broadcastTreeChange(String(req.project!._id));
    res.json({ ok: true });
  })
);

filesRouter.post(
  '/copy',
  requireProject('editor'),
  validate(z.object({ from: z.string().min(1), to: z.string().min(1) })),
  asyncHandler(async (req, res) => {
    await copyEntry(String(req.project!._id), req.body.from, req.body.to);
    broadcastTreeChange(String(req.project!._id));
    res.json({ ok: true });
  })
);

filesRouter.post(
  '/delete',
  requireProject('editor'),
  validate(z.object({ path: z.string().min(1) })),
  asyncHandler(async (req, res) => {
    await deleteEntry(String(req.project!._id), req.body.path);
    broadcastTreeChange(String(req.project!._id));
    res.json({ ok: true });
  })
);

filesRouter.post(
  '/upload',
  requireProject('editor'),
  upload.array('files'),
  asyncHandler(async (req, res) => {
    const projectId = String(req.project!._id);
    const destDir = String(req.body.dir || '');
    const files = (req.files || []) as Express.Multer.File[];
    for (const file of files) {
      const target = safeJoin(projectId, path.posix.join(destDir, file.originalname));
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.copyFile(file.path, target);
      await fs.rm(file.path, { force: true });
    }
    broadcastTreeChange(projectId);
    res.json({ ok: true, count: files.length });
  })
);

filesRouter.get(
  '/download',
  requireProject('viewer'),
  asyncHandler(async (req, res) => {
    const projectId = String(req.project!._id);
    const relPath = String(req.query.path || '');
    if (!relPath) {
      // whole workspace as zip
      res.attachment(`${req.project!.name.replace(/[^\w-]+/g, '-')}.zip`);
      return void zipWorkspace(projectId).pipe(res);
    }
    const abs = safeJoin(projectId, relPath);
    const stat = await fs.stat(abs);
    if (stat.isDirectory()) {
      res.attachment(`${path.basename(abs)}.zip`);
      return void zipWorkspace(projectId, relPath).pipe(res);
    }
    res.download(abs);
  })
);

filesRouter.get(
  '/search',
  requireProject('viewer'),
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '');
    const caseSensitive = req.query.cs === '1';
    if (q.length < 2) return res.json([]);
    res.json(await searchInFiles(String(req.project!._id), q, { caseSensitive }));
  })
);
