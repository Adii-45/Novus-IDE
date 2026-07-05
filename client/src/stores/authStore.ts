import { create } from 'zustand';
import type { User } from '@/types';

interface AuthState {
  accessToken: string | null;
  user: User | null;
  /** true until the initial silent refresh attempt finishes */
  booting: boolean;
  setSession: (token: string, user: User) => void;
  setUser: (user: User) => void;
  clearSession: () => void;
  setBooted: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  booting: true,
  setSession: (accessToken, user) => set({ accessToken, user, booting: false }),
  setUser: (user) => set({ user }),
  clearSession: () => set({ accessToken: null, user: null, booting: false }),
  setBooted: () => set({ booting: false }),
}));
