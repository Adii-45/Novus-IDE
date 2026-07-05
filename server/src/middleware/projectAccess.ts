import type { Request, Response, NextFunction } from 'express';
import { Project, memberRole, type IProject, type ProjectRole } from '../models/Project.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      project?: IProject;
      projectRole?: ProjectRole;
    }
  }
}

const ROLE_RANK: Record<ProjectRole, number> = { viewer: 0, editor: 1, owner: 2 };

/**
 * Loads req.project from :projectId and asserts the requester has at
 * least `minRole` on it.
 */
export function requireProject(minRole: ProjectRole = 'viewer') {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    const project = await Project.findById(req.params.projectId);
    if (!project) throw ApiError.notFound('Project not found');
    const role = memberRole(project, req.auth!.sub);
    if (!role || ROLE_RANK[role] < ROLE_RANK[minRole]) {
      throw ApiError.forbidden('You do not have access to this project');
    }
    req.project = project;
    req.projectRole = role;
    next();
  });
}
