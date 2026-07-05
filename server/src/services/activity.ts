import { Activity } from '../models/Activity.js';

export async function recordActivity(
  actorId: string,
  action: string,
  detail = '',
  projectId?: string
) {
  try {
    await Activity.create({ actor: actorId, action, detail, project: projectId });
  } catch {
    // Activity is best-effort; never block the main operation.
  }
}
