import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';
import type { Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';

export interface CollabDoc {
  doc: Y.Doc;
  text: Y.Text;
  awareness: Awareness;
}

function toBase64(u8: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < u8.length; i += 0x8000) {
    bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

// ------------------------------------------------- remote cursor stylesheet
// y-monaco decorates remote selections with `.yRemoteSelection-<clientId>`.
// We inject one rule per collaborator that sets the CSS vars the base
// stylesheet reads (--collab-color / --collab-name).
let styleEl: HTMLStyleElement | null = null;
const styledClients = new Map<number, string>();

function syncCursorStyles(awareness: Awareness) {
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.dataset.collabCursors = '';
    document.head.appendChild(styleEl);
  }
  let changed = false;
  awareness.getStates().forEach((state, clientId) => {
    if (clientId === awareness.clientID) return;
    const user = state.user as { name?: string; color?: string } | undefined;
    if (!user?.color) return;
    const key = `${user.color}|${user.name ?? ''}`;
    if (styledClients.get(clientId) !== key) {
      styledClients.set(clientId, key);
      changed = true;
    }
  });
  if (!changed) return;
  styleEl.textContent = [...styledClients.entries()]
    .map(([clientId, key]) => {
      const [color, name] = key.split('|');
      const safeName = name.replace(/["\\]/g, '');
      return `.yRemoteSelection-${clientId}, .yRemoteSelectionHead-${clientId} { --collab-color: ${color}; --collab-name: "${safeName}"; }`;
    })
    .join('\n');
}

const CURSOR_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#EF4444', '#84CC16'];

/**
 * Join the shared Yjs document for `path` over the /collab socket.
 * Returns null until the initial state has been applied — mount the
 * Monaco binding only once this resolves so no keystrokes are lost.
 */
export function useCollabDoc(socket: Socket | null, joined: boolean, path: string | null): CollabDoc | null {
  const user = useAuthStore((s) => s.user);
  const [session, setSession] = useState<CollabDoc | null>(null);

  useEffect(() => {
    if (!socket || !joined || !path || !user) return;

    const doc = new Y.Doc();
    const text = doc.getText('content');
    const awareness = new Awareness(doc);
    awareness.setLocalStateField('user', {
      name: user.name,
      color: user.avatarColor || CURSOR_COLORS[doc.clientID % CURSOR_COLORS.length],
    });

    let disposed = false;

    const onDocUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin !== 'remote') socket.emit('doc:update', { path, update: toBase64(update) });
    };
    const onRemoteDocUpdate = (payload: { path: string; update: string }) => {
      if (payload.path !== path) return;
      Y.applyUpdate(doc, fromBase64(payload.update), 'remote');
    };
    const onAwarenessUpdate = (
      { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
      origin: unknown
    ) => {
      syncCursorStyles(awareness);
      if (origin === 'remote') return;
      const changed = [...added, ...updated, ...removed];
      socket.emit('awareness', { path, update: toBase64(encodeAwarenessUpdate(awareness, changed)) });
    };
    const onRemoteAwareness = (payload: { path: string; update: string }) => {
      if (payload.path !== path) return;
      applyAwarenessUpdate(awareness, fromBase64(payload.update), 'remote');
    };

    socket.emit('doc:join', { path }, (stateB64: string) => {
      if (disposed) return;
      if (stateB64) Y.applyUpdate(doc, fromBase64(stateB64), 'remote');
      doc.on('update', onDocUpdate);
      awareness.on('update', onAwarenessUpdate);
      socket.on('doc:update', onRemoteDocUpdate);
      socket.on('awareness', onRemoteAwareness);
      // Announce our presence in this doc right away.
      socket.emit('awareness', {
        path,
        update: toBase64(encodeAwarenessUpdate(awareness, [awareness.clientID])),
      });
      setSession({ doc, text, awareness });
    });

    return () => {
      disposed = true;
      socket.emit('doc:leave', { path });
      socket.off('doc:update', onRemoteDocUpdate);
      socket.off('awareness', onRemoteAwareness);
      doc.off('update', onDocUpdate);
      awareness.destroy();
      doc.destroy();
      setSession(null);
    };
  }, [socket, joined, path, user]);

  return session;
}
