import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';

/**
 * Create a Socket.IO connection to one of the server namespaces
 * ('/app', '/terminal', '/collab'), authenticated with the current
 * access token. `auth` is a function so reconnects pick up a refreshed token.
 */
export function createSocket(namespace: '/app' | '/terminal' | '/collab'): Socket {
  return io(namespace, {
    path: '/socket.io',
    transports: ['websocket'],
    auth: (cb) => cb({ token: useAuthStore.getState().accessToken }),
    reconnectionDelay: 800,
    reconnectionDelayMax: 5000,
  });
}
