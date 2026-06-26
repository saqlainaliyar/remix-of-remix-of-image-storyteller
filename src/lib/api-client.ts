import type { BrandKit, Template } from "./editor-types";

const API_URL =
  (import.meta as any).env?.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:4000";

const TOKEN_KEY = "ff_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(t: string | null) {
  if (typeof window === "undefined") return;
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

export function assetUrl(path: string | undefined | null): string {
  if (!path) return "";
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return `${API_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (res.status === 401) {
    setToken(null);
    throw new Error("Unauthorized");
  }
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(body?.error || `Request failed: ${res.status}`);
  return body as T;
}

export interface AuthUser { id: string; email: string }
export interface AuthResponse { token: string; user: AuthUser }

export const api = {
  baseUrl: API_URL,
  health: () => request<{ ok: true }>("/health"),

  auth: {
    register: (email: string, password: string) =>
      request<AuthResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    login: (email: string, password: string) =>
      request<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    logout: () => request<{ ok: true }>("/api/auth/logout", { method: "POST" }),
    me: () => request<{ user: AuthUser }>("/api/auth/me"),
  },

  templates: {
    list: () => request<{ templates: Template[] }>("/api/templates"),
    get: (id: string) => request<{ template: Template }>(`/api/templates/${id}`),
    create: (t: Omit<Template, "id" | "createdAt" | "updatedAt">) =>
      request<{ template: Template }>("/api/templates", {
        method: "POST",
        body: JSON.stringify(t),
      }),
    update: (id: string, t: Partial<Template>) =>
      request<{ template: Template }>(`/api/templates/${id}`, {
        method: "PUT",
        body: JSON.stringify(t),
      }),
    remove: (id: string) =>
      request<{ ok: true }>(`/api/templates/${id}`, { method: "DELETE" }),
    patchLayer: (id: string, layerName: string, patch: Record<string, unknown>) =>
      request<{ template: Template; patchedLayer: any }>(
        `/api/templates/${id}/layers/${encodeURIComponent(layerName)}`,
        { method: "PATCH", body: JSON.stringify(patch) },
      ),
    autosave: (id: string, data: unknown) =>
      request<{ ok: true }>(`/api/templates/${id}/autosave`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    autosaveGet: (id: string) =>
      request<{ data: unknown | null }>(`/api/templates/${id}/autosave`),
    undo: (id: string) =>
      request<{ template: Template }>(`/api/templates/${id}/undo`, { method: "POST" }),
    render: (id: string, patches?: Array<{ name: string; patch: Record<string, unknown> }>) =>
      request<{ success: true; imageUrl: string; width: number; height: number }>(
        `/api/templates/${id}/render`,
        { method: "POST", body: JSON.stringify({ patches: patches ?? [] }) },
      ),
  },

  uploads: {
    upload: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const token = getToken();
      const res = await fetch(`${API_URL}/api/uploads`, {
        method: "POST",
        body: fd,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Upload failed");
      return (await res.json()) as {
        url: string;
        thumbnailUrl: string;
        width: number;
        height: number;
        size: number;
        mime: string;
      };
    },
  },

  brandKit: {
    // Brand kit is kept client-side for now; expose hooks for future server sync.
    get: async (): Promise<BrandKit | null> => null,
  },

  keys: {
    list: () => request<{ keys: ApiKeyInfo[] }>("/api/keys"),
    create: (name: string) =>
      request<ApiKeyCreated>("/api/keys", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    remove: (id: string) =>
      request<{ ok: true }>(`/api/keys/${id}`, { method: "DELETE" }),
  },
};

export interface ApiKeyInfo {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  used: number;
  limit: number;
}

export interface ApiKeyCreated {
  key: string;
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  limit: number;
}
