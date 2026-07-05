import pty, { type IPty } from 'node-pty';
import { workspaceDir } from '../utils/paths.js';
import { logger } from '../utils/logger.js';

export interface TerminalSession {
  id: string; // `${projectId}:${terminalId}`
  projectId: string;
  pty: IPty;
  scrollback: string;
  subscribers: Set<(data: string) => void>;
  exited: boolean;
}

const MAX_SCROLLBACK = 200_000; // chars kept for reconnect replay
const sessions = new Map<string, TerminalSession>();

function sessionKey(projectId: string, terminalId: string) {
  return `${projectId}:${terminalId}`;
}

/**
 * Get or create a persistent pty for a project terminal tab.
 * When the project has a running Docker container we attach a real shell
 * inside it via `docker exec`; otherwise we fall back to a local shell
 * rooted at the workspace directory.
 */
export function getOrCreateTerminal(opts: {
  projectId: string;
  terminalId: string;
  containerId?: string;
  cols: number;
  rows: number;
}): TerminalSession {
  const key = sessionKey(opts.projectId, opts.terminalId);
  const existing = sessions.get(key);
  if (existing && !existing.exited) {
    existing.pty.resize(opts.cols, opts.rows);
    return existing;
  }

  let proc: IPty;
  if (opts.containerId) {
    proc = pty.spawn(
      'docker',
      ['exec', '-it', '-w', '/workspace', opts.containerId, '/bin/bash'],
      {
        name: 'xterm-256color',
        cols: opts.cols,
        rows: opts.rows,
        env: { ...process.env, TERM: 'xterm-256color' } as Record<string, string>,
      }
    );
  } else {
    const shell = process.env.SHELL || '/bin/bash';
    proc = pty.spawn(shell, ['-l'], {
      name: 'xterm-256color',
      cols: opts.cols,
      rows: opts.rows,
      cwd: workspaceDir(opts.projectId),
      env: { ...process.env, TERM: 'xterm-256color' } as Record<string, string>,
    });
  }

  const session: TerminalSession = {
    id: key,
    projectId: opts.projectId,
    pty: proc,
    scrollback: '',
    subscribers: new Set(),
    exited: false,
  };

  proc.onData((data) => {
    session.scrollback = (session.scrollback + data).slice(-MAX_SCROLLBACK);
    for (const cb of session.subscribers) cb(data);
  });

  proc.onExit(({ exitCode }) => {
    session.exited = true;
    const msg = `\r\n\x1b[38;5;244m[process exited with code ${exitCode}]\x1b[0m\r\n`;
    session.scrollback += msg;
    for (const cb of session.subscribers) cb(msg);
    // Keep the session record briefly so clients see the exit message, then drop it.
    setTimeout(() => {
      if (sessions.get(key)?.exited) sessions.delete(key);
    }, 30_000);
  });

  sessions.set(key, session);
  logger.info(`terminal ${key} started (${opts.containerId ? 'docker' : 'local'})`);
  return session;
}

export function killTerminal(projectId: string, terminalId: string) {
  const key = sessionKey(projectId, terminalId);
  const session = sessions.get(key);
  if (session) {
    try {
      session.pty.kill();
    } catch {
      // already dead
    }
    sessions.delete(key);
  }
}

export function killProjectTerminals(projectId: string) {
  for (const [key, session] of sessions) {
    if (session.projectId === projectId) {
      try {
        session.pty.kill();
      } catch {
        // already dead
      }
      sessions.delete(key);
    }
  }
}

export function listProjectTerminals(projectId: string): string[] {
  return [...sessions.values()]
    .filter((s) => s.projectId === projectId && !s.exited)
    .map((s) => s.id.split(':')[1]);
}
