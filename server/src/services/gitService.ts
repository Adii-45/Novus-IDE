import { simpleGit, type SimpleGit } from 'simple-git';
import { workspaceDir } from '../utils/paths.js';

function git(projectId: string): SimpleGit {
  return simpleGit({ baseDir: workspaceDir(projectId) });
}

export async function cloneRepository(repoUrl: string, targetDir: string) {
  await simpleGit().clone(repoUrl, targetDir, ['--depth', '50']);
}

export async function isRepo(projectId: string): Promise<boolean> {
  try {
    return await git(projectId).checkIsRepo();
  } catch {
    return false;
  }
}

export async function initRepo(projectId: string) {
  const g = git(projectId);
  await g.init();
  await g.addConfig('user.email', 'workspace@novuside.local', false, 'local').catch(() => undefined);
  await g.addConfig('user.name', 'NovusIDE', false, 'local').catch(() => undefined);
}

export async function gitStatus(projectId: string) {
  const g = git(projectId);
  const [status, branchInfo] = await Promise.all([g.status(), g.branch().catch(() => null)]);
  return {
    branch: status.current || 'main',
    ahead: status.ahead,
    behind: status.behind,
    tracking: status.tracking,
    branches: branchInfo?.all ?? [],
    staged: status.staged,
    created: status.created,
    modified: status.modified,
    deleted: status.deleted,
    renamed: status.renamed.map((r) => r.to),
    untracked: status.not_added,
    conflicted: status.conflicted,
  };
}

export async function stageFiles(projectId: string, paths: string[]) {
  await git(projectId).add(paths.length ? paths : ['-A']);
}

export async function unstageFiles(projectId: string, paths: string[]) {
  const g = git(projectId);
  await g.reset(paths.length ? ['HEAD', '--', ...paths] : ['HEAD']);
}

export async function discardChanges(projectId: string, paths: string[]) {
  const g = git(projectId);
  if (paths.length) await g.checkout(['--', ...paths]);
}

export async function commit(projectId: string, message: string, authorName: string, authorEmail: string) {
  const g = git(projectId);
  const result = await g.commit(message, undefined, {
    '--author': `${authorName} <${authorEmail}>`,
  });
  return { hash: result.commit, summary: result.summary };
}

export async function push(projectId: string) {
  return git(projectId).push();
}

export async function pull(projectId: string) {
  return git(projectId).pull();
}

export async function listBranches(projectId: string) {
  const result = await git(projectId).branch();
  return { current: result.current, all: result.all };
}

export async function checkoutBranch(projectId: string, branch: string, create = false) {
  const g = git(projectId);
  if (create) await g.checkoutLocalBranch(branch);
  else await g.checkout(branch);
}

export async function log(projectId: string, limit = 50) {
  const result = await git(projectId).log({ maxCount: limit });
  return result.all.map((c) => ({
    hash: c.hash,
    shortHash: c.hash.slice(0, 7),
    message: c.message,
    author: c.author_name,
    email: c.author_email,
    date: c.date,
  }));
}

/** Unified diff for one file (worktree vs HEAD, or staged when requested). */
export async function diffFile(projectId: string, filePath: string, staged = false) {
  const g = git(projectId);
  const args = staged ? ['--cached', '--', filePath] : ['--', filePath];
  return g.diff(args);
}

/** File content at HEAD, used for side-by-side diff in the editor. */
export async function showHead(projectId: string, filePath: string): Promise<string> {
  try {
    return await git(projectId).show([`HEAD:${filePath}`]);
  } catch {
    return ''; // new file — nothing at HEAD
  }
}
