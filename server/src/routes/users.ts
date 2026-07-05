import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User, publicUser } from '../models/User.js';
import { Session } from '../models/Session.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

export const usersRouter = Router();
usersRouter.use(requireAuth);

usersRouter.get(
  '/me',
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.auth!.sub);
    if (!user) throw ApiError.notFound();
    res.json(publicUser(user));
  })
);

const profileSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  bio: z.string().max(240).optional(),
  avatarColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

usersRouter.patch(
  '/me',
  validate(profileSchema),
  asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(req.auth!.sub, { $set: req.body }, { new: true });
    if (!user) throw ApiError.notFound();
    res.json(publicUser(user));
  })
);

const settingsSchema = z.object({
  editor: z
    .object({
      fontSize: z.number().min(10).max(24).optional(),
      tabSize: z.number().min(1).max(8).optional(),
      wordWrap: z.boolean().optional(),
      minimap: z.boolean().optional(),
      formatOnSave: z.boolean().optional(),
      autoSave: z.boolean().optional(),
      theme: z.string().optional(),
    })
    .optional(),
  notifications: z
    .object({
      mentions: z.boolean().optional(),
      invites: z.boolean().optional(),
      projectActivity: z.boolean().optional(),
    })
    .optional(),
});

usersRouter.patch(
  '/me/settings',
  validate(settingsSchema),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.auth!.sub);
    if (!user) throw ApiError.notFound();
    if (req.body.editor) Object.assign(user.settings.editor, req.body.editor);
    if (req.body.notifications) Object.assign(user.settings.notifications, req.body.notifications);
    await user.save();
    res.json(publicUser(user));
  })
);

usersRouter.post(
  '/me/password',
  validate(
    z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8).max(128),
    })
  ),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.auth!.sub);
    if (!user) throw ApiError.notFound();
    if (!user.passwordHash || !(await bcrypt.compare(req.body.currentPassword, user.passwordHash))) {
      throw ApiError.badRequest('Current password is incorrect');
    }
    user.passwordHash = await bcrypt.hash(req.body.newPassword, 11);
    await user.save();
    // Keep this session, revoke the rest.
    await Session.deleteMany({ user: user._id, lastActiveAt: { $lt: new Date(Date.now() - 60_000) } });
    res.json({ ok: true });
  })
);

/** Lightweight lookup used for @mentions and member pickers. */
usersRouter.get(
  '/lookup',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json([]);
    const users = await User.find({
      $or: [{ name: { $regex: q, $options: 'i' } }, { email: { $regex: `^${q}`, $options: 'i' } }],
    })
      .limit(8)
      .select('name email avatarColor');
    res.json(users.map((u) => ({ id: String(u._id), name: u.name, email: u.email, avatarColor: u.avatarColor })));
  })
);
