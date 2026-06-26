import { useEffect, useState } from "react";
import { api, getToken, setToken, type AuthUser } from "./api-client";

type Listener = (s: AuthState) => void;

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
}

const state: AuthState = {
  user: null,
  token: typeof window === "undefined" ? null : getToken(),
  loading: false,
};
const listeners = new Set<Listener>();
function emit() { for (const l of listeners) l({ ...state }); }

export const authStore = {
  get: () => ({ ...state }),
  subscribe(l: Listener) { listeners.add(l); return () => listeners.delete(l); },

  async hydrate() {
    const token = getToken();
    if (!token) return;
    state.token = token;
    state.loading = true; emit();
    try {
      const { user } = await api.auth.me();
      state.user = user;
    } catch {
      setToken(null);
      state.token = null;
      state.user = null;
    } finally {
      state.loading = false; emit();
    }
  },

  async login(email: string, password: string) {
    const { token, user } = await api.auth.login(email, password);
    setToken(token);
    state.token = token; state.user = user; emit();
  },

  async register(email: string, password: string) {
    const { token, user } = await api.auth.register(email, password);
    setToken(token);
    state.token = token; state.user = user; emit();
  },

  async logout() {
    try { await api.auth.logout(); } catch { /* ignore */ }
    setToken(null);
    state.token = null; state.user = null; emit();
  },
};

export function useAuth() {
  const [s, setS] = useState<AuthState>(() => authStore.get());
  useEffect(() => authStore.subscribe(setS), []);
  return s;
}
