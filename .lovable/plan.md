# Self-Hosted Backend + Auth for Frameforge

The Lovable preview runs on a serverless edge runtime, so the backend you described (Postgres, Redis, local `/storage` filesystem, long-running render workers) lives in a separate folder you deploy yourself. The frontend in this project will call it over HTTP.

## What gets built

### 1. `backend/` (new folder, standalone Node service)

```text
backend/
  src/
    index.ts                 # Express app + bootstrap
    db.ts                    # pg Pool
    redis.ts                 # ioredis client
    auth/
      routes.ts              # /api/auth/register, /login, /me, /logout
      middleware.ts          # JWT verify -> req.user
      password.ts            # argon2 hash/verify
    templates/
      routes.ts              # CRUD + patch-by-layer-name + render
      render.ts              # renders Template JSON -> PNG via skia-canvas
      schema.ts              # zod schemas mirroring src/lib/editor-types.ts
    uploads/
      routes.ts              # multer -> /storage/uploads, thumbnails via sharp
    cache.ts                 # get/set helpers, autosave, undo/redo lists
  migrations/
    001_init.sql             # users, templates, assets, sessions
  storage/                   # gitignored: templates/ uploads/ thumbnails/ exports/
  Dockerfile
  docker-compose.yml         # api + postgres + redis
  .env.example
  package.json
  README.md                  # run instructions
```

**Stack:** Express 5, `pg`, `ioredis`, `jsonwebtoken`, `argon2`, `zod`, `multer`, `sharp`, `skia-canvas` (pure-JS canvas for rendering; no headless Chrome needed), `cors`.

**Postgres schema (`001_init.sql`):**
- `users(id uuid pk, email citext unique, password_hash text, created_at)`
- `templates(id uuid pk, user_id fk, name text, width int, height int, data jsonb, thumbnail_path text, updated_at)` — `data` holds the full `Template` JSON from `src/lib/editor-types.ts`.
- `assets(id uuid pk, user_id fk, kind text check in ('upload','thumbnail','export'), path text, filename text, width int, height int, size_bytes bigint, mime text, created_at)` — only metadata, files live on disk.
- Indexes on `(user_id, updated_at desc)`.

**Redis usage (key conventions):**
- `session:<jti>` → token revoke list (logout).
- `autosave:<userId>:<templateId>` → latest unsaved JSON, TTL 24h.
- `tpl:<id>` → cached template JSON, TTL 5m, invalidated on write.
- `resp:<hash>` → API response cache for GET list endpoints, TTL 30s.
- `render:<sha256(templateJson)>` → cached export path, TTL 1h.
- `history:<userId>:<templateId>` → Redis LIST of past states (LPUSH/LTRIM 50) for undo/redo.

**Auth endpoints:**
- `POST /api/auth/register` `{ email, password }` → `{ token, user }`
- `POST /api/auth/login` → `{ token, user }`
- `POST /api/auth/logout` (adds jti to revoke set)
- `GET  /api/auth/me`

JWT in `Authorization: Bearer <token>`, 7-day expiry, secret from `JWT_SECRET` env.

**Template endpoints (all require auth):**
- `GET    /api/templates` — list user's templates (cached).
- `POST   /api/templates` — create from JSON body.
- `GET    /api/templates/:id` — full template.
- `PUT    /api/templates/:id` — replace whole template.
- `DELETE /api/templates/:id`
- `PATCH  /api/templates/:id/layers/:layerName` — **the layer-name patch endpoint.** Body is a partial layer (e.g. `{ "text": "New headline" }` or `{ "imageUrl": "/uploads/abc.png" }`). Server finds the layer by `name`, deep-merges the patch, pushes prior state to undo list, invalidates caches.
- `POST   /api/templates/:id/autosave` — writes to Redis only.
- `POST   /api/templates/:id/undo` / `/redo` — pops from Redis history list.
- `POST   /api/templates/:id/render` — body may include an array of layer-name patches applied in-memory, then renders.

**Render pipeline (`render.ts`):**
1. Load template (Redis → Postgres fallback).
2. Apply any inline layer patches from request.
3. Hash the resulting JSON; if `render:<hash>` exists, return cached path.
4. Use `skia-canvas` to draw layers in order:
   - `background` — solid fill or image (fit cover/contain via `sharp` if needed).
   - `image` — load from `/storage/uploads/...`, apply fit + radius mask.
   - `gradient` — linear / radial / conic / diamond, with per-stop opacity and `mixBlendMode` via composite ops.
   - `text` — wrap, autoFit (binary search font size), primary/secondary span backgrounds with symmetric padding, shadow.
5. Save PNG to `/storage/exports/render-<id>.png`, insert `assets` row, cache hash → path.
6. Return:
   ```json
   { "success": true, "imageUrl": "/exports/render-<id>.png", "width": 1080, "height": 1080 }
   ```

**Static serving:** Express `express.static('/storage', { ... })` mounted at `/` so `/uploads/...`, `/thumbnails/...`, `/exports/...` are publicly readable. Upload writes are auth-gated.

**Uploads:** `POST /api/uploads` (multipart). Multer writes to `/storage/uploads/<uuid>.<ext>`, `sharp` produces a 400px thumbnail in `/storage/thumbnails/`, both rows inserted in `assets`, response includes `{ url, thumbnailUrl, width, height, size, mime }`.

**Deployment:** `docker compose up` brings up Postgres 16, Redis 7, and the API on `:4000`. `.env.example` documents `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `STORAGE_DIR`, `PUBLIC_BASE_URL`, `CORS_ORIGIN`.

### 2. Frontend integration (this Lovable project)

- `src/lib/api-client.ts` — `fetch` wrapper that reads `VITE_API_URL`, attaches `Authorization` header from a `useAuth` store, throws typed errors.
- `src/lib/auth-store.ts` — Zustand store: `user`, `token`, `login`, `register`, `logout`. Token persisted in `localStorage` under `ff_token`.
- `src/routes/auth.tsx` — login + register tabs (shadcn `Tabs`, `Input`, `Button`). Redirects to `/templates` on success.
- `src/components/AuthGate.tsx` — wraps the editor and templates routes; redirects to `/auth` when no token.
- `src/routes/editor.tsx` + `src/routes/templates.tsx` — wrap content in `AuthGate`.
- `src/lib/storage.ts` — replace `localStorage` template I/O with `api-client` calls (`listTemplates`, `saveTemplate`, `deleteTemplate`, `getTemplate`). Same function signatures so callers don't change.
- `src/components/editor/EditorToolbar.tsx` — `Save` calls `saveTemplate` (API). Add a `Render` button that POSTs to `/api/templates/:id/render` and opens the returned `imageUrl`.
- Autosave: a `useEffect` in editor debounces template changes (1s) and `POST`s to `/autosave`.
- `.env.example` in repo root documenting `VITE_API_URL=http://localhost:4000`.

### 3. README updates

Root `README.md` section explaining: run `backend/` via `docker compose up`, set `VITE_API_URL`, then the frontend works against it. Note that this Lovable preview environment cannot host the backend itself.

## Out of scope

- OAuth / social login (email+password only this pass).
- Multi-user template sharing / permissions beyond owner-only.
- Background job queue (renders run inline; fine for typical sizes).
- Migrating existing `localStorage` templates — users start fresh against the API.

## Open question I'm assuming a default for

I'm assuming **email + password** auth only. If you also want Google/Apple sign-in, say so and I'll add `passport` + OAuth routes to the backend plan.
