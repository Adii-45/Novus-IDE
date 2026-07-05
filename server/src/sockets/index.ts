import type { Server, Socket } from 'socket.io';
import { verifyAccessToken, type AccessPayload } from '../utils/tokens.js';
import { Project, memberRole, type ProjectRole } from '../models/Project.js';
import { setIO } from './io.js';
import { registerTerminalNamespace } from './terminal.js';
import { registerCollabNamespace } from './collab.js';

export interface AuthedSocket extends Socket {
  data: {
    user: AccessPayload;
    projectId?: string;
    role?: ProjectRole;
  };
}

/** Shared handshake auth: expects a valid access token in socket.handshake.auth.token. */
function socketAuth(socket: Socket, next: (err?: Error) => void) {
  try {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('unauthorized'));
    (socket as AuthedSocket).data.user = verifyAccessToken(token);
    next();
  } catch {
    next(new Error('unauthorized'));
  }
}

/** Verify project membership for a socket; returns the role or null. */
export async function socketProjectRole(userId: string, projectId: string): Promise<ProjectRole | null> {
  const project = await Project.findById(projectId).catch(() => null);
  if (!project) return null;
  return memberRole(project, userId);
}

export function registerSockets(io: Server) {
  setIO(io);

  // App-level namespace: per-user rooms for notifications.
  const app = io.of('/app');
  app.use(socketAuth);
  app.on('connection', (socket) => {
    const authed = socket as AuthedSocket;
    void socket.join(`user:${authed.data.user.sub}`);
  });

  const terminal = io.of('/terminal');
  terminal.use(socketAuth);
  registerTerminalNamespace(terminal);

  const collab = io.of('/collab');
  collab.use(socketAuth);
  registerCollabNamespace(collab);
}
