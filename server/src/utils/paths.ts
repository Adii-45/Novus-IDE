import path from 'node:path';
import { config } from '../config.js';
import { ApiError } from './ApiError.js';

/** Absolute path of a project's workspace directory on the host. */
export function workspaceDir(projectId: string): string {
  return path.join(config.workspacesRoot, projectId);
}

/**
 * Resolve a user-supplied relative path inside a project workspace,
 * rejecting any attempt to escape it (`..`, absolute paths, symlink-ish tricks
 * are additionally guarded at the fs layer).
 */
export function safeJoin(projectId: string, relPath: string): string {
  const root = workspaceDir(projectId);
  const cleaned = (relPath || '').replace(/^[/\\]+/, '');
  const abs = path.resolve(root, cleaned);
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    throw ApiError.badRequest('Invalid path');
  }
  return abs;
}

export function toRelative(projectId: string, absPath: string): string {
  return path.relative(workspaceDir(projectId), absPath).split(path.sep).join('/');
}
