# Frameforge Backend

Self-hosted Node + PostgreSQL + Redis backend for Frameforge.

## Quick start (Docker)

```bash
cp .env.example .env
docker compose up --build
docker compose exec api npm run migrate
```

API runs on http://localhost:4000. Storage lives in `./storage` (mounted into the container).

## Local dev (no Docker)

Requirements: Node 20+, PostgreSQL 14+, Redis 6+, plus skia-canvas system libs (`libcairo`, `libpango`, `libjpeg`, `libgif`, `librsvg`). On macOS: `brew install cairo pango jpeg giflib librsvg`.

```bash
cp .env.example .env  # edit DATABASE_URL / REDIS_URL
npm install
npm run migrate
npm run dev
```

## Endpoints

### Auth
- `POST /api/auth/register` `{ email, password }` → `{ token, user }`
- `POST /api/auth/login` → `{ token, user }`
- `POST /api/auth/logout` (Bearer token)
- `GET  /api/auth/me`

All other endpoints require `Authorization: Bearer <token>`.

### Templates
- `GET    /api/templates`
- `POST   /api/templates` body: full template JSON
- `GET    /api/templates/:id`
- `PUT    /api/templates/:id`
- `DELETE /api/templates/:id`
- `PATCH  /api/templates/:id/layers/:layerName` body: partial layer (e.g. `{ "text": "New title" }` or `{ "imageUrl": "/uploads/abc.png" }`)
- `POST   /api/templates/:id/autosave` body: full template snapshot (Redis only, 24h TTL)
- `GET    /api/templates/:id/autosave`
- `POST   /api/templates/:id/undo`
- `POST   /api/templates/:id/render` body: `{ "patches": [{ "name": "title", "patch": { "text": "..." } }] }` (optional)
  → `{ "success": true, "imageUrl": "/exports/render-<hash>.png", "width": 1080, "height": 1080 }`

### Uploads
- `POST /api/uploads` multipart field `file` → `{ url, thumbnailUrl, width, height, size, mime }`

### Static
- `GET /uploads/...`, `/thumbnails/...`, `/exports/...`

## Storage layout

```
storage/
  uploads/      original user images
  thumbnails/   400px JPEG thumbs
  exports/      rendered PNGs
  templates/    reserved
```

DB stores only metadata (path, filename, width, height, size, mime).

## Redis keys

- `revoked:<jti>` — JWT revocation
- `autosave:<userId>:<templateId>` — 24h
- `tpl:<id>` — template cache, 5m
- `tpl:list:<userId>` — list cache, 30s
- `render:<hash>` — render cache, 1h
- `history:<userId>:<templateId>` — undo list (LPUSH/LTRIM 50)

## Frontend wiring

Set `VITE_API_URL=http://localhost:4000` in the Frameforge project root `.env`, then sign up at `/auth`.
