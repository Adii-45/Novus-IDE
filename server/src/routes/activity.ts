import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Activity } from '../models/Activity.js';
import { Project } from '../models/Project.js';

export const activityRouter = Router();
activityRouter.use(requireAuth);

/** Recent activity across every project the user can see. */
activityRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.auth!.sub;
    const projects = await Project.find({
      $or: [{ owner: userId }, { 'members.user': userId }],
    }).select('_id name');
    const projectIds = projects.map((p) => p._id);
    const nameById = new Map(projects.map((p) => [String(p._id), p.name]));

    const items = await Activity.find({
      $or: [{ actor: userId }, { project: { $in: projectIds } }],
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('actor', 'name avatarColor');

    res.json(
      items.map((a) => {
        const actor = a.actor as unknown as { _id: unknown; name?: string; avatarColor?: string };
        return {
          id: String(a._id),
          action: a.action,
          detail: a.detail,
          projectId: a.project ? String(a.project) : null,
          projectName: a.project ? nameById.get(String(a.project)) ?? null : null,
          actor: {
            id: String(actor._id),
            name: actor.name || 'Unknown',
            avatarColor: actor.avatarColor || '#3B82F6',
          },
          createdAt: a.createdAt,
        };
      })
    );
  })
);
