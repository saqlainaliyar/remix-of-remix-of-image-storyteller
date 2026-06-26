## Goal
1. Require sign-in for every meaningful action in the app (templates, editor, brand kit, batch, uploads, render).
2. Add a personal **API Key** feature so users can generate/revoke keys and call the backend programmatically, with a hard cap of **30 requests per month per key**.

## Part 1 — Compulsory auth (frontend)

- Wrap protected routes with the existing `AuthGate`: `/templates`, `/editor`, `/brand-kit`, `/batch`, `/api-docs` (the docs page stays viewable, but its "Try it" / key-management section requires auth).
- Update `src/routes/index.tsx` home page CTAs: if no token, primary buttons route to `/auth?redirect=...` instead of straight into the editor.
- Remove the local-storage fallback path in `src/routes/templates.tsx` (no more anonymous browser-only templates) — always go through the backend.
- Add a top-bar `AuthBadge` in `AppShell` so the user can see sign-in state everywhere.
- `/auth` page accepts a `?redirect=` search param and bounces back after login.

## Part 2 — Compulsory auth (backend)

- In `backend/src/index.ts`, mount `requireAuth` on:
  - `/api/templates/*` (already, verify)
  - `/api/uploads/*`
  - `/api/render/*`
- Return `401` consistently; the frontend `api-client` already redirects to `/auth` on 401.

## Part 3 — API Key feature

### Database (`backend/migrations/002_api_keys.sql`)
```sql
CREATE TABLE api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL,          -- first 8 chars, shown in UI
  key_hash text NOT NULL UNIQUE,     -- sha256 of full key
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
CREATE TABLE api_key_usage (
  key_id uuid REFERENCES api_keys(id) ON DELETE CASCADE,
  period char(7) NOT NULL,           -- 'YYYY-MM'
  count int NOT NULL DEFAULT 0,
  PRIMARY KEY (key_id, period)
);
```

### Backend routes (`backend/src/apikeys/routes.ts`)
- `POST /api/keys` — create key (returns raw key **once**: `ff_live_<32 hex>`).
- `GET /api/keys` — list user's keys (prefix + name + usage this month + limit).
- `DELETE /api/keys/:id` — revoke.

### API-key auth middleware (`backend/src/apikeys/middleware.ts`)
- Accept `Authorization: Bearer ff_live_...` **or** `X-API-Key: ...`.
- SHA-256 the incoming key, look it up, reject if revoked.
- Atomically increment `api_key_usage` for the current `YYYY-MM`. If `count > 30`, return `429 Too Many Requests` with `X-RateLimit-Limit: 30`, `X-RateLimit-Remaining: 0`, `Retry-After` until next month.
- Backed by a Redis counter (`apikey:{id}:{YYYY-MM}`) for fast checks; persisted to Postgres asynchronously.
- Sets `req.user` like the JWT middleware so existing handlers work unchanged.

### Public programmatic endpoints
Mount under `/api/v1/*` with the API-key middleware (JWT not accepted here):
- `GET  /api/v1/templates`
- `GET  /api/v1/templates/:id`
- `POST /api/v1/templates/:id/render` (existing render logic)
- `PATCH /api/v1/templates/:id/layers/:name` (existing patch-by-layer-name)

The browser app keeps using JWT-protected `/api/*` routes unchanged.

### Frontend
- New route `src/routes/api-keys.tsx` (auth-gated): create / list / copy-once / revoke, plus usage bar (`X / 30 this month`).
- Update `src/routes/api-docs.tsx` to document `Authorization: Bearer ff_live_...`, the 30/month cap, and the 429 response shape.
- Add nav link "API Keys" in `AppShell` when signed in.

## Part 4 — Quota UX
- `429` from `/api/v1/*` returns:
  ```json
  { "error": "Monthly limit reached", "limit": 30, "used": 30, "resetsAt": "2026-07-01T00:00:00Z" }
  ```
- `api-keys.tsx` shows the same numbers from `GET /api/keys`.

## Files touched
**New**: `backend/migrations/002_api_keys.sql`, `backend/src/apikeys/{routes,middleware,service}.ts`, `backend/src/routes/v1.ts`, `src/routes/api-keys.tsx`, `src/lib/api-keys-client.ts`.
**Edited**: `backend/src/index.ts`, `backend/src/uploads/routes.ts`, `backend/src/templates/routes.ts` (mount auth), `src/routes/{templates,editor,brand-kit,batch,api-docs,index,auth}.tsx`, `src/components/AppShell.tsx`, `src/lib/api-client.ts` (handle 429 + key endpoints).

## Out of scope
- Per-IP rate limiting for unauthenticated traffic (separate concern).
- Tiered plans / paid quotas — the 30/month cap is a fixed hard limit for now.
- Rotating an existing key in place (revoke + create is the flow).
