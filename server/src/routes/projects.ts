import { Router } from 'express';
import { z } from 'zod';
import { Project, memberRole, type IProject } from '../models/Project.js';
import { User } from '../models/User.js';
import { Invitation } from '../models/Invitation.js';
import { requireAuth } from '../middleware/auth.js';
import { requireProject } from '../middleware/projectAccess.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import {
  scaffoldFromTemplate,
  duplicateWorkspace,
  deleteWorkspace,
  ensureWorkspace,
} from '../services/workspace.js';
import { destroyContainer } from '../services/docker.js';
import { cloneRepository } from '../services/gitService.js';
import { recordActivity } from '../services/activity.js';
import { createNotification } from '../services/notify.js';
import { sendInviteEmail } from '../services/email.js';
import { TEMPLATES } from '../services/templates.js';

export const projectsRouter = Router();
projectsRouter.use(requireAuth);

function serializeProject(p: IProject, userId: string) {
  const obj = p.toObject({ virtuals: false });
  return {
    id: String(p._id),
    name: p.name,
    description: p.description,
    template: p.template,
    owner: typeof obj.owner === 'object' && obj.owner && 'name' in obj.owner
      ? { id: String((obj.owner as { _id: unknown })._id), name: (obj.owner as { name: string }).name, avatarColor: (obj.owner as { avatarColor?: string }).avatarColor }
      : { id: String(p.owner) },
    role: memberRole(p, userId),
    members: p.members.map((m) => {
      const u = m.user as unknown as { _id: unknown; name?: string; email?: string; avatarColor?: string };
      return {
        id: String(u._id ?? m.user),
        name: u.name,
        email: u.email,
        avatarColor: u.avatarColor,
        role: m.role,
        addedAt: m.addedAt,
      };
    }),
    starred: p.starredBy.some((u) => String(u) === userId),
    pinned: p.pinnedBy.some((u) => String(u) === userId),
    archived: p.archived,
    previewPort: p.previewPort,
    gitRepoUrl: p.gitRepoUrl,
    lastOpenedAt: p.lastOpenedAt,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

// ---------------------------------------------------------------- templates
projectsRouter.get('/templates', (_req, res) => {
  res.json(TEMPLATES);
});

// --------------------------------------------------------------------- list
projectsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.auth!.sub;
    const projects = await Project.find({
      $or: [{ owner: userId }, { 'members.user': userId }],
    })
      .populate('owner', 'name email avatarColor')
      .populate('members.user', 'name email avatarColor')
      .sort({ lastOpenedAt: -1 });
    res.json(projects.map((p) => serializeProject(p, userId)));
  })
);

// ------------------------------------------------------------------- create
const createSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(300).optional().default(''),
  template: z.string().optional().default('blank'),
});

projectsRouter.post(
  '/',
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const userId = req.auth!.sub;
    const { name, description, template } = req.body;
    const project = await Project.create({
      name,
      description,
      template,
      owner: userId,
      members: [{ user: userId, role: 'owner' }],
    });
    await scaffoldFromTemplate(String(project._id), template);
    await recordActivity(userId, 'project.created', name, String(project._id));
    await project.populate('owner', 'name email avatarColor');
    await project.populate('members.user', 'name email avatarColor');
    res.status(201).json(serializeProject(project, userId));
  })
);

// ------------------------------------------------------------------- import
const importSchema = z.object({
  name: z.string().min(1).max(80),
  repoUrl: z.string().url(),
});

projectsRouter.post(
  '/import',
  validate(importSchema),
  asyncHandler(async (req, res) => {
    const userId = req.auth!.sub;
    const { name, repoUrl } = req.body;
    const project = await Project.create({
      name,
      template: 'git-import',
      gitRepoUrl: repoUrl,
      owner: userId,
      members: [{ user: userId, role: 'owner' }],
    });
    const dir = await ensureWorkspace(String(project._id));
    try {
      await cloneRepository(repoUrl, dir);
    } catch (err) {
      await Project.findByIdAndDelete(project._id);
      await deleteWorkspace(String(project._id));
      throw ApiError.badRequest(
        `Could not clone repository: ${(err as Error).message?.split('\n')[0] ?? 'unknown error'}`
      );
    }
    await recordActivity(userId, 'project.imported', `${name} ← ${repoUrl}`, String(project._id));
    await project.populate('owner', 'name email avatarColor');
    await project.populate('members.user', 'name email avatarColor');
    res.status(201).json(serializeProject(project, userId));
  })
);

// ---------------------------------------------------------------------- get
projectsRouter.get(
  '/:projectId',
  requireProject('viewer'),
  asyncHandler(async (req, res) => {
    const project = req.project!;
    project.lastOpenedAt = new Date();
    await project.save();
    await project.populate('owner', 'name email avatarColor');
    await project.populate('members.user', 'name email avatarColor');
    res.json(serializeProject(project, req.auth!.sub));
  })
);

// ------------------------------------------------------------------- update
const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(300).optional(),
  archived: z.boolean().optional(),
});

projectsRouter.patch(
  '/:projectId',
  requireProject('owner'),
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const project = req.project!;
    Object.assign(project, req.body);
    await project.save();
    if (req.body.name) await recordActivity(req.auth!.sub, 'project.renamed', req.body.name, String(project._id));
    await project.populate('owner', 'name email avatarColor');
    await project.populate('members.user', 'name email avatarColor');
    res.json(serializeProject(project, req.auth!.sub));
  })
);

// --------------------------------------------------------------- star / pin
projectsRouter.post(
  '/:projectId/star',
  requireProject('viewer'),
  asyncHandler(async (req, res) => {
    const project = req.project!;
    const userId = req.auth!.sub;
    const starred = project.starredBy.some((u) => String(u) === userId);
    if (starred) project.starredBy = project.starredBy.filter((u) => String(u) !== userId);
    else project.starredBy.push(userId as never);
    await project.save();
    res.json({ starred: !starred });
  })
);

projectsRouter.post(
  '/:projectId/pin',
  requireProject('viewer'),
  asyncHandler(async (req, res) => {
    const project = req.project!;
    const userId = req.auth!.sub;
    const pinned = project.pinnedBy.some((u) => String(u) === userId);
    if (pinned) project.pinnedBy = project.pinnedBy.filter((u) => String(u) !== userId);
    else project.pinnedBy.push(userId as never);
    await project.save();
    res.json({ pinned: !pinned });
  })
);

// ---------------------------------------------------------------- duplicate
projectsRouter.post(
  '/:projectId/duplicate',
  requireProject('editor'),
  asyncHandler(async (req, res) => {
    const source = req.project!;
    const userId = req.auth!.sub;
    const copy = await Project.create({
      name: `${source.name} (copy)`,
      description: source.description,
      template: source.template,
      owner: userId,
      members: [{ user: userId, role: 'owner' }],
    });
    await duplicateWorkspace(String(source._id), String(copy._id));
    await recordActivity(userId, 'project.duplicated', source.name, String(copy._id));
    await copy.populate('owner', 'name email avatarColor');
    await copy.populate('members.user', 'name email avatarColor');
    res.status(201).json(serializeProject(copy, userId));
  })
);

// ------------------------------------------------------------------- delete
projectsRouter.delete(
  '/:projectId',
  requireProject('owner'),
  asyncHandler(async (req, res) => {
    const project = req.project!;
    await destroyContainer(project).catch(() => undefined);
    await deleteWorkspace(String(project._id));
    await Invitation.deleteMany({ project: project._id });
    await project.deleteOne();
    await recordActivity(req.auth!.sub, 'project.deleted', project.name);
    res.json({ ok: true });
  })
);

// ------------------------------------------------------------------ members
const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['editor', 'viewer']).default('editor'),
});

projectsRouter.post(
  '/:projectId/members',
  requireProject('owner'),
  validate(inviteSchema),
  asyncHandler(async (req, res) => {
    const project = req.project!;
    const inviter = req.auth!;
    const { email, role } = req.body;

    const user = await User.findOne({ email });
    if (user) {
      if (String(user._id) === inviter.sub || project.members.some((m) => String(m.user) === String(user._id))) {
        throw ApiError.conflict('This user is already a member');
      }
      project.members.push({ user: user._id as never, role, addedAt: new Date() });
      await project.save();
      await createNotification(String(user._id), {
        type: 'invite',
        title: `${inviter.name} added you to ${project.name}`,
        body: `You can now open the project as ${role}.`,
        link: `/ide/${project._id}`,
      });
      await recordActivity(inviter.sub, 'member.added', email, String(project._id));
      return res.json({ status: 'added' });
    }

    const existing = await Invitation.findOne({ project: project._id, email, status: 'pending' });
    if (existing) throw ApiError.conflict('An invitation for this email is already pending');
    await Invitation.create({ project: project._id, email, role, invitedBy: inviter.sub });
    await sendInviteEmail(email, inviter.name, project.name);
    await recordActivity(inviter.sub, 'member.invited', email, String(project._id));
    res.json({ status: 'invited' });
  })
);

projectsRouter.patch(
  '/:projectId/members/:userId',
  requireProject('owner'),
  validate(z.object({ role: z.enum(['editor', 'viewer']) })),
  asyncHandler(async (req, res) => {
    const project = req.project!;
    const member = project.members.find((m) => String(m.user) === req.params.userId);
    if (!member) throw ApiError.notFound('Member not found');
    if (String(project.owner) === req.params.userId) throw ApiError.badRequest('Cannot change the owner role');
    member.role = req.body.role;
    await project.save();
    res.json({ ok: true });
  })
);

projectsRouter.delete(
  '/:projectId/members/:userId',
  requireProject('owner'),
  asyncHandler(async (req, res) => {
    const project = req.project!;
    if (String(project.owner) === req.params.userId) throw ApiError.badRequest('Cannot remove the owner');
    project.members = project.members.filter((m) => String(m.user) !== req.params.userId) as never;
    await project.save();
    res.json({ ok: true });
  })
);

projectsRouter.get(
  '/:projectId/invitations',
  requireProject('owner'),
  asyncHandler(async (req, res) => {
    const invites = await Invitation.find({ project: req.project!._id, status: 'pending' });
    res.json(
      invites.map((i) => ({ id: String(i._id), email: i.email, role: i.role, createdAt: i.createdAt }))
    );
  })
);

projectsRouter.delete(
  '/:projectId/invitations/:inviteId',
  requireProject('owner'),
  asyncHandler(async (req, res) => {
    await Invitation.deleteOne({ _id: req.params.inviteId, project: req.project!._id });
    res.json({ ok: true });
  })
);
