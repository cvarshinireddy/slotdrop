// One import for the whole app. VITE_API_MODE=mock runs entirely in the browser (no server needed).
import { mockApi, subscribe as mockSubscribe } from '@/mocks/mockApi';
import { realApi } from './realApi';
import { io } from 'socket.io-client';

export const API_MODE = import.meta.env.VITE_API_MODE === 'mock' ? 'mock' : 'api';
export const api = API_MODE === 'mock' ? mockApi : realApi;
export { ApiError, setUnauthorizedHandler } from './realApi';

/**
 * Subscribe to live events. Returns an unsubscribe function.
 * api mode: Socket.io (JWT in handshake). mock mode: in-browser bus synced across tabs.
 */
export function connectRealtime(handlers) {
  if (API_MODE === 'mock') {
    const offs = Object.entries(handlers).map(([evt, fn]) => mockSubscribe(evt, fn));
    return () => offs.forEach((off) => off());
  }
  const socket = io(import.meta.env.VITE_API_URL || '/', { auth: { token: sessionStorage.getItem('slotdrop-token') }, transports: ['websocket', 'polling'] });
  Object.entries(handlers).forEach(([evt, fn]) => socket.on(evt, fn));
  return () => socket.disconnect();
}
