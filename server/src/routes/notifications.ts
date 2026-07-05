import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Notification } from '../models/Notification.js';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const [items, unread] = await Promise.all([
      Notification.find({ user: req.auth!.sub }).sort({ createdAt: -1 }).limit(40),
      Notification.countDocuments({ user: req.auth!.sub, read: false }),
    ]);
    res.json({
      unread,
      items: items.map((n) => ({
        id: String(n._id),
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.link,
        read: n.read,
        createdAt: n.createdAt,
      })),
    });
  })
);

notificationsRouter.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    await Notification.updateMany({ user: req.auth!.sub, read: false }, { $set: { read: true } });
    res.json({ ok: true });
  })
);

notificationsRouter.post(
  '/:id/read',
  asyncHandler(async (req, res) => {
    await Notification.updateOne({ _id: req.params.id, user: req.auth!.sub }, { $set: { read: true } });
    res.json({ ok: true });
  })
);
