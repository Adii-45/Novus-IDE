import type { Namespace } from 'socket.io';
import { User } from '../models/User.js';
import { ChatMessage } from '../models/ChatMessage.js';
import { createNotification } from '../services/notify.js';
import {
  joinDoc,
  getDoc,
  applyUpdate,
  leaveDoc,
  leaveAllDocs,
  encodeStateAsUpdate,
} from '../services/collab.js';
import type { AuthedSocket } from './index.js';
import { socketProjectRole } from './index.js';

interface PresenceUser {
  socketId: string;
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  activeFile: string | null;
  typing: boolean;
}

// projectId -> socketId -> presence
const presence = new Map<string, Map<string, PresenceUser>>();

function projectRoom(projectId: string) {
  return `project:${projectId}`;
}
function docRoom(projectId: string, path: string) {
  return `doc:${projectId}:${path}`;
}

function broadcastPresence(ns: Namespace, projectId: string) {
  const users = [...(presence.get(projectId)?.values() ?? [])];
  ns.to(projectRoom(projectId)).emit('presence', users);
}

/**
 * /collab namespace — one project per socket connection.
 * Handles presence, Yjs document sync (Socket.IO as the Yjs transport),
 * awareness relay for remote cursors, and workspace chat.
 */
export function registerCollabNamespace(ns: Namespace) {
  ns.on('connection', (rawSocket) => {
    const socket = rawSocket as AuthedSocket;
    const joinedDocs = new Set<string>();

    socket.on('project:join', async ({ projectId }: { projectId: string }, ack?: (ok: boolean) => void) => {
      const role = await socketProjectRole(socket.data.user.sub, projectId);
      if (!role) {
        ack?.(false);
        return socket.disconnect();
      }
      socket.data.projectId = projectId;
      socket.data.role = role;
      await socket.join(projectRoom(projectId));

      const profile = await User.findById(socket.data.user.sub).select('name email avatarColor');
      if (!presence.has(projectId)) presence.set(projectId, new Map());
      presence.get(projectId)!.set(socket.id, {
        socketId: socket.id,
        id: socket.data.user.sub,
        name: profile?.name || socket.data.user.name,
        email: profile?.email || socket.data.user.email,
        avatarColor: profile?.avatarColor || '#3B82F6',
        activeFile: null,
        typing: false,
      });
      broadcastPresence(ns, projectId);
      ack?.(true);
    });

    socket.on('presence:update', ({ activeFile }: { activeFile: string | null }) => {
      const projectId = socket.data.projectId;
      if (!projectId) return;
      const me = presence.get(projectId)?.get(socket.id);
      if (me) {
        me.activeFile = activeFile;
        broadcastPresence(ns, projectId);
      }
    });

    // ------------------------------------------------------------- Yjs docs
    socket.on('doc:join', async ({ path }: { path: string }, ack?: (state: string) => void) => {
      const projectId = socket.data.projectId;
      if (!projectId || !path) return;
      try {
        const live = await joinDoc(projectId, path, socket.id);
        joinedDocs.add(path);
        await socket.join(docRoom(projectId, path));
        ack?.(Buffer.from(encodeStateAsUpdate(live)).toString('base64'));
      } catch {
        ack?.('');
      }
    });

    socket.on('doc:update', ({ path, update }: { path: string; update: string }) => {
      const projectId = socket.data.projectId;
      if (!projectId || !path || socket.data.role === 'viewer') return;
      const live = getDoc(projectId, path);
      if (!live) return;
      try {
        applyUpdate(live, new Uint8Array(Buffer.from(update, 'base64')));
        socket.to(docRoom(projectId, path)).emit('doc:update', { path, update });
      } catch {
        // malformed update — drop it
      }
    });

    socket.on('awareness', ({ path, update }: { path: string; update: string }) => {
      const projectId = socket.data.projectId;
      if (!projectId || !path) return;
      socket.to(docRoom(projectId, path)).emit('awareness', { path, update });
    });

    socket.on('doc:leave', async ({ path }: { path: string }) => {
      const projectId = socket.data.projectId;
      if (!projectId || !path) return;
      joinedDocs.delete(path);
      await socket.leave(docRoom(projectId, path));
      await leaveDoc(projectId, path, socket.id);
    });

    // ----------------------------------------------------------------- chat
    socket.on(
      'chat:send',
      async (
        { body, mentions }: { body: string; mentions?: string[] },
        ack?: (msg: unknown) => void
      ) => {
        const projectId = socket.data.projectId;
        if (!projectId || !body?.trim() || socket.data.role === 'viewer') return;
        const trimmed = body.trim().slice(0, 4000);
        const mentionIds = (mentions || []).filter((m) => /^[0-9a-f]{24}$/.test(m));
        const doc = await ChatMessage.create({
          project: projectId,
          author: socket.data.user.sub,
          body: trimmed,
          mentions: mentionIds,
        });
        const me = presence.get(projectId)?.get(socket.id);
        const message = {
          id: String(doc._id),
          projectId,
          author: {
            id: socket.data.user.sub,
            name: me?.name || socket.data.user.name,
            avatarColor: me?.avatarColor || '#3B82F6',
          },
          body: trimmed,
          mentions: mentionIds,
          createdAt: doc.createdAt,
        };
        ns.to(projectRoom(projectId)).emit('chat:message', message);
        ack?.(message);

        for (const userId of mentionIds) {
          if (userId === socket.data.user.sub) continue;
          await createNotification(userId, {
            type: 'mention',
            title: `${message.author.name} mentioned you`,
            body: trimmed.slice(0, 120),
            link: `/ide/${projectId}`,
          });
        }
      }
    );

    socket.on('chat:typing', (isTyping: boolean) => {
      const projectId = socket.data.projectId;
      if (!projectId) return;
      const me = presence.get(projectId)?.get(socket.id);
      if (me) {
        me.typing = isTyping;
        socket.to(projectRoom(projectId)).emit('chat:typing', { userId: me.id, name: me.name, typing: isTyping });
      }
    });

    // ----------------------------------------------------------- disconnect
    socket.on('disconnect', () => {
      const projectId = socket.data.projectId;
      leaveAllDocs(socket.id);
      if (projectId) {
        presence.get(projectId)?.delete(socket.id);
        if (presence.get(projectId)?.size === 0) presence.delete(projectId);
        broadcastPresence(ns, projectId);
      }
    });
  });
}
