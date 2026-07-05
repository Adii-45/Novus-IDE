import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireProject } from '../middleware/projectAccess.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ChatMessage } from '../models/ChatMessage.js';

export const chatRouter = Router({ mergeParams: true });
chatRouter.use(requireAuth);

chatRouter.get(
  '/messages',
  requireProject('viewer'),
  asyncHandler(async (req, res) => {
    const before = req.query.before ? new Date(String(req.query.before)) : null;
    const query: Record<string, unknown> = { project: req.project!._id };
    if (before && !Number.isNaN(before.getTime())) query.createdAt = { $lt: before };
    const messages = await ChatMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('author', 'name avatarColor');
    res.json(
      messages.reverse().map((m) => {
        const author = m.author as unknown as { _id: unknown; name?: string; avatarColor?: string };
        return {
          id: String(m._id),
          projectId: String(m.project),
          author: {
            id: String(author._id),
            name: author.name || 'Unknown',
            avatarColor: author.avatarColor || '#3B82F6',
          },
          body: m.body,
          mentions: m.mentions.map(String),
          createdAt: m.createdAt,
        };
      })
    );
  })
);
