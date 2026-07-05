import type { Namespace } from 'socket.io';
import { Project } from '../models/Project.js';
import { getContainerStatus } from '../services/docker.js';
import { getOrCreateTerminal, killTerminal, type TerminalSession } from '../services/terminal.js';
import type { AuthedSocket } from './index.js';
import { socketProjectRole } from './index.js';

/**
 * /terminal namespace — one socket may attach to one pty at a time.
 *
 * client → attach { projectId, terminalId, cols, rows }
 * server → attached { terminalId } then data events (scrollback replay first)
 * client → input (string), resize { cols, rows }, kill
 */
export function registerTerminalNamespace(ns: Namespace) {
  ns.on('connection', (rawSocket) => {
    const socket = rawSocket as AuthedSocket;
    let session: TerminalSession | null = null;
    let subscriber: ((data: string) => void) | null = null;

    const detach = () => {
      if (session && subscriber) session.subscribers.delete(subscriber);
      session = null;
      subscriber = null;
    };

    socket.on('attach', async (payload: { projectId: string; terminalId: string; cols?: number; rows?: number }) => {
      try {
        const { projectId, terminalId } = payload;
        const role = await socketProjectRole(socket.data.user.sub, projectId);
        if (!role || role === 'viewer') {
          return socket.emit('term:error', 'You need editor access to use the terminal');
        }
        detach();

        // Prefer a shell inside the project container when it's running.
        const project = await Project.findById(projectId);
        let containerId: string | undefined;
        if (project) {
          const status = await getContainerStatus(project);
          if (status.state === 'running') containerId = project.containerId;
        }

        session = getOrCreateTerminal({
          projectId,
          terminalId,
          containerId,
          cols: payload.cols || 80,
          rows: payload.rows || 24,
        });

        socket.emit('attached', { terminalId, runtime: containerId ? 'docker' : 'local' });
        if (session.scrollback) socket.emit('data', session.scrollback);

        subscriber = (data: string) => socket.emit('data', data);
        session.subscribers.add(subscriber);
      } catch (err) {
        socket.emit('term:error', `Failed to start terminal: ${(err as Error).message}`);
      }
    });

    socket.on('input', (data: string) => {
      if (session && !session.exited) session.pty.write(data);
    });

    socket.on('resize', ({ cols, rows }: { cols: number; rows: number }) => {
      if (session && !session.exited && cols > 0 && rows > 0) {
        try {
          session.pty.resize(cols, rows);
        } catch {
          // pty may have exited between checks
        }
      }
    });

    socket.on('kill', ({ projectId, terminalId }: { projectId: string; terminalId: string }) => {
      detach();
      killTerminal(projectId, terminalId);
    });

    socket.on('disconnect', detach);
  });
}
