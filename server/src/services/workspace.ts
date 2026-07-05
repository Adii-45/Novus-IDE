import fs from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import path from 'node:path';
import archiver from 'archiver';
import { config } from '../config.js';
import { workspaceDir, safeJoin, toRelative } from '../utils/paths.js';
import { ApiError } from '../utils/ApiError.js';

export interface FileNode {
  name: string;
  path: string; // workspace-relative, posix separators
  type: 'file' | 'folder';
  size?: number;
  children?: FileNode[];
}

const IGNORED_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', '__pycache__', '.venv', '.cache']);
const MAX_READ_BYTES = 2 * 1024 * 1024; // 2 MB editor ceiling

export async function ensureWorkspace(projectId: string): Promise<string> {
  const dir = workspaceDir(projectId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function scaffoldFromTemplate(projectId: string, template: string) {
  const dir = await ensureWorkspace(projectId);
  const src = path.join(config.templatesRoot, template);
  try {
    await fs.access(src);
  } catch {
    return; // unknown/blank template → empty workspace
  }
  await fs.cp(src, dir, { recursive: true });
}

export async function duplicateWorkspace(fromId: string, toId: string) {
  const src = workspaceDir(fromId);
  const dest = await ensureWorkspace(toId);
  try {
    await fs.cp(src, dest, {
      recursive: true,
      filter: (p) => !p.includes(`${path.sep}node_modules`) && !p.includes(`${path.sep}.git${path.sep}`),
    });
  } catch {
    // empty source workspace is fine
  }
}

export async function deleteWorkspace(projectId: string) {
  await fs.rm(workspaceDir(projectId), { recursive: true, force: true });
}

export async function readTree(projectId: string, showHidden = false): Promise<FileNode[]> {
  const root = await ensureWorkspace(projectId);

  async function walk(dir: string): Promise<FileNode[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const nodes: FileNode[] = [];
    for (const entry of entries) {
      if (!showHidden && entry.name === '.git') continue;
      const abs = path.join(dir, entry.name);
      const rel = toRelative(projectId, abs);
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) {
          nodes.push({ name: entry.name, path: rel, type: 'folder', children: [] });
          continue;
        }
        nodes.push({ name: entry.name, path: rel, type: 'folder', children: await walk(abs) });
      } else if (entry.isFile()) {
        const stat = await fs.stat(abs);
        nodes.push({ name: entry.name, path: rel, type: 'file', size: stat.size });
      }
    }
    nodes.sort((a, b) =>
      a.type !== b.type ? (a.type === 'folder' ? -1 : 1) : a.name.localeCompare(b.name)
    );
    return nodes;
  }

  return walk(root);
}

export async function readFileContent(projectId: string, relPath: string) {
  const abs = safeJoin(projectId, relPath);
  const stat = await fs.stat(abs).catch(() => null);
  if (!stat || !stat.isFile()) throw ApiError.notFound('File not found');
  if (stat.size > MAX_READ_BYTES) throw ApiError.badRequest('File is too large to open in the editor');
  const buf = await fs.readFile(abs);
  // Cheap binary sniff: NUL byte in the first 8KB.
  const head = buf.subarray(0, 8192);
  const isBinary = head.includes(0);
  return { content: isBinary ? '' : buf.toString('utf8'), isBinary, size: stat.size };
}

export async function writeFileContent(projectId: string, relPath: string, content: string) {
  const abs = safeJoin(projectId, relPath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, content, 'utf8');
}

export async function createEntry(projectId: string, relPath: string, type: 'file' | 'folder') {
  const abs = safeJoin(projectId, relPath);
  const exists = await fs.stat(abs).catch(() => null);
  if (exists) throw ApiError.conflict('A file or folder with that name already exists');
  if (type === 'folder') {
    await fs.mkdir(abs, { recursive: true });
  } else {
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, '', 'utf8');
  }
}

export async function renameEntry(projectId: string, fromRel: string, toRel: string) {
  const from = safeJoin(projectId, fromRel);
  const to = safeJoin(projectId, toRel);
  const exists = await fs.stat(to).catch(() => null);
  if (exists) throw ApiError.conflict('Target already exists');
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.rename(from, to);
}

export async function copyEntry(projectId: string, fromRel: string, toRel: string) {
  const from = safeJoin(projectId, fromRel);
  const to = safeJoin(projectId, toRel);
  const exists = await fs.stat(to).catch(() => null);
  if (exists) throw ApiError.conflict('Target already exists');
  await fs.cp(from, to, { recursive: true });
}

export async function deleteEntry(projectId: string, relPath: string) {
  const abs = safeJoin(projectId, relPath);
  if (abs === workspaceDir(projectId)) throw ApiError.badRequest('Cannot delete the workspace root');
  await fs.rm(abs, { recursive: true, force: true });
}

export interface SearchMatch {
  path: string;
  line: number;
  column: number;
  preview: string;
}

export async function searchInFiles(
  projectId: string,
  query: string,
  opts: { caseSensitive?: boolean; maxResults?: number } = {}
): Promise<SearchMatch[]> {
  const root = await ensureWorkspace(projectId);
  const maxResults = opts.maxResults ?? 300;
  const needle = opts.caseSensitive ? query : query.toLowerCase();
  const results: SearchMatch[] = [];

  async function walk(dir: string) {
    if (results.length >= maxResults) return;
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (results.length >= maxResults) return;
      if (entry.name.startsWith('.git')) continue;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) await walk(abs);
      } else if (entry.isFile()) {
        const stat = await fs.stat(abs);
        if (stat.size > 512 * 1024) continue;
        const buf = await fs.readFile(abs);
        if (buf.subarray(0, 8192).includes(0)) continue;
        const text = buf.toString('utf8');
        const lines = text.split('\n');
        for (let i = 0; i < lines.length && results.length < maxResults; i++) {
          const hay = opts.caseSensitive ? lines[i] : lines[i].toLowerCase();
          let col = hay.indexOf(needle);
          while (col !== -1 && results.length < maxResults) {
            results.push({
              path: toRelative(projectId, abs),
              line: i + 1,
              column: col + 1,
              preview: lines[i].trim().slice(0, 200),
            });
            col = hay.indexOf(needle, col + needle.length);
          }
        }
      }
    }
  }

  if (needle.length >= 2) await walk(root);
  return results;
}

/** Stream the whole workspace (or a folder) as a zip download. */
export function zipWorkspace(projectId: string, relPath = '') {
  const abs = safeJoin(projectId, relPath);
  const archive = archiver('zip', { zlib: { level: 6 } });
  archive.glob('**/*', {
    cwd: abs,
    ignore: ['node_modules/**', '.git/**'],
    dot: true,
  });
  archive.finalize();
  return archive;
}

export { createReadStream, createWriteStream };
