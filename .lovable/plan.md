## Goal
Add a Bannerbear-style modification surface to both the editor and the REST API. The API becomes the star: a single `POST /v1/images` endpoint accepts `{ template, modifications[], webhook_url?, transparent?, metadata?, template_version? }`, queues a render, returns `202 Accepted` with a job id, and either posts to `webhook_url` when done or is polled via `GET /v1/images/:uid`. Also supports synchronous mode (`?synchronous=1`) that blocks and returns the finished image inline. The editor's Properties panel gains the same field names so what you tweak in-app maps 1:1 to what the API accepts.

## Modification schema (single flat list, Bannerbear-compatible)

Every modification is keyed by `name` (the layer's `name` in the template). Fields are ignored when they don't apply to the layer's type — matches Bannerbear's behavior.

| Field | Applies to | Notes |
|---|---|---|
| `name` | required | layer name |
| `color` | text, gradient, background | hex |
| `text` | text | supports `*highlighted*` spans |
| `background` | text | text-container bg fill |
| `background_border_color` | text | — |
| `font_family` | text | maps to `fontFamily` |
| `text_align_h` | text | left / center / right |
| `text_align_v` | text | top / center / bottom (adds `verticalAlign` to `TextLayer`) |
| `font_family_2` | text | secondary font |
| `color_2` | text | secondary color |
| `image_url` | image, background | — |
| `effect` | image | none / grayscale / sepia / blur / duotone |
| `anchor_x` | image | left / center / right |
| `anchor_y` | image | top / center / bottom |
| `fill_type` | image | fill (cover) / fit (contain) |
| `disable_face_detect` | image | boolean, no-op stub for now |
| `disable_smart_crop` | image | boolean, no-op stub for now |
| `gradient` | any layer | `["#000","#FFF"]` → converts to a 2-stop linear gradient fill |
| `shadow` | any | CSS box/text-shadow string, e.g. `"5px 5px 0 #CCC"` |
| `border_width` | any | integer |
| `border_color` | any | hex |
| `shift_x` | any | integer px offset from template x |
| `shift_y` | any | integer px offset from template y |
| `target` | any | click URL, embedded in PDF renders only |
| `hide` | any | boolean |

Also supported (existing gradient fields kept): `feather`, `featherSoftness`, `blendMode`, `stops` (deep-merged as today).

Top-level request fields: `template`, `modifications`, `webhook_url`, `transparent` (PNG alpha bg), `render_pdf` (renders PDF instead of PNG), `template_version` (integer, ignored until versions land — accepted with a warning), `metadata` (string, echoed on job + webhook).

## Backend changes

### DB — `backend/migrations/003_image_jobs.sql` (new)
```sql
CREATE TABLE image_jobs (
  uid            TEXT PRIMARY KEY,           -- img_<ulid>
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id    TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending',   -- pending | completed | failed
  image_url      TEXT,
  width          INTEGER,
  height         INTEGER,
  render_time_ms INTEGER,
  webhook_url    TEXT,
  metadata       TEXT,
  transparent    BOOLEAN NOT NULL DEFAULT false,
  render_pdf     BOOLEAN NOT NULL DEFAULT false,
  modifications  JSONB NOT NULL,
  error          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at   TIMESTAMPTZ
);
CREATE INDEX ON image_jobs(user_id, created_at DESC);
```

### `backend/src/v1/routes.ts`
Add three routes (still gated by `requireApiKey`):

- `POST /v1/images` — validates body with Zod, inserts a `pending` `image_jobs` row, kicks off async render via `setImmediate` (or a tiny in-process queue — no new infra), returns `202 { uid, status:"pending", template, metadata, self:"/v1/images/{uid}" }`. When `?synchronous=1`, `await` the render inline and return `200` with the completed job body.
- `GET /v1/images/:uid` — returns the job row, scoped to caller's user.
- `GET /v1/images` — paginated list, newest first, `?status=&limit=&before=`.

Extract a shared `applyModifications(layers, modifications)` helper into `backend/src/templates/modifications.ts` that translates the Bannerbear-flat fields into our internal layer shape (mapping `font_family` → `fontFamily`, `fill_type: "fill"` → `fit: "cover"`, `gradient: ["#000","#FFF"]` → `gradient: { type:"linear", angle:180, stops:[…] }`, `shift_x/y` → offset `x`/`y`, etc.). `PATCH /v1/templates/:id/layers/:layerName` and `POST /v1/templates/:id/render` both switch to using it so all three surfaces accept the same fields.

### Renderer — `backend/src/templates/render.ts`
- Honor `transparent: true` by skipping the default background fill on the output canvas.
- Honor `render_pdf: true` by wrapping the PNG output in a single-page PDF (uses `pdf-lib`, already Worker-compat; embed PNG). If `pdf-lib` isn't installed, add it via `bun add pdf-lib` in the backend workspace.
- Apply `shadow`, `border_width`, `border_color`, `shift_x/y`, `target`, `hide` on every layer type via a small shared pre-pass.

### Webhooks
When a job finishes and `webhook_url` is set, POST the full job object (same shape as `GET /v1/images/:uid`) with header `X-Frameforge-Signature: sha256=<hmac>` using a per-user secret (new column on `users` table via migration, generated on first webhook use). Retry up to 3× with backoff on non-2xx. Failure to deliver doesn't affect job status.

## Frontend / editor changes

### `src/lib/editor-types.ts`
- `TextLayer`: add `verticalAlign: "top" | "center" | "bottom"` (default `center`).
- `ImageLayer`: add `anchorX: "left"|"center"|"right"` (default `center`), `anchorY: "top"|"center"|"bottom"` (default `center`), `effect: "none"|"grayscale"|"sepia"|"blur"|"duotone"` (default `none`).
- `BaseLayer`: add `shadow?: string`, `shiftX?: number`, `shiftY?: number`, `target?: string`, `borderColor?: string`, `borderWidth?: number` (image layer's existing `borderColor`/`borderWidth` become the base ones — kept as-is for image, opt-in on other types).

### `src/components/editor/PropertiesPanel.tsx`
Add matching controls, grouped exactly like the API doc:

- Text: `text_align_v` segmented control, `font_family_2` + `color_2` for the highlighted style, `background` + `background_border_color` bg pickers (reuse existing `bgColor`).
- Image: `effect` dropdown, `anchor_x` / `anchor_y` segmented controls, `fill_type` (fill / fit).
- Any Layer: `shadow` text input with a small "5px 5px 0 #CCC" placeholder, `border_width`, `border_color`, `shift_x`, `shift_y`, `target` (URL) input, `hide` toggle (mirrors `visible`).

### `src/components/editor/Canvas.tsx`
- Text: apply `verticalAlign` via `justify-content` on the text-layer flex column.
- Image: `effect` → CSS `filter` (grayscale/sepia/blur/duotone via `filter: grayscale(1)` etc.; duotone uses a two-color `mix-blend-mode` overlay).
- Any layer: `shadow` → CSS `box-shadow` (text layer also gets `text-shadow`), `shiftX/shiftY` add to render position, `hide` mirrors `visible`.

### `src/routes/api-docs.tsx`
Rewrite to document exactly the endpoints above with real `curl` examples:

1. Auth & 30/month limit.
2. `POST /v1/images` — full modifications example with text + image + gradient; response body; note about 202 + webhook + `?synchronous=1`.
3. `GET /v1/images/:uid` — polling shape.
4. `GET /v1/images` — list.
5. `POST /v1/templates/:id/render` — one-off render without a persisted job.
6. `PATCH /v1/templates/:id/layers/:layerName` — persistent layer edit.
7. Modification fields table (full Bannerbear list from the schema above, marking not-yet-implemented flags with an "advisory" tag: `disable_face_detect`, `disable_smart_crop`, `template_version`).
8. Errors: 401, 404, 429 with example JSON bodies and `X-RateLimit-Reset` headers.

Remove the obsolete `POST /v1/batch` CSV section (endpoint doesn't exist).

## Out of scope
- Real face detection / smart crop implementations — fields accepted, ignored.
- Multi-page PDFs.
- Chart / star rating / QR / barcode layer types (fields documented as "coming soon" only if we add stub layers; otherwise not documented yet).
- Signed webhook secret rotation UI (auto-generated once, surfaced on API Keys page in a later pass).
- Template versioning storage.

## Files touched
Backend:
- new `backend/migrations/003_image_jobs.sql`
- new `backend/src/templates/modifications.ts`
- new `backend/src/images/routes.ts` (mounted under `/v1/images` from `backend/src/index.ts`)
- edited `backend/src/v1/routes.ts` (use shared modifications helper)
- edited `backend/src/templates/render.ts` (transparent bg, pdf output, shared layer effects)
- edited `backend/src/index.ts` (mount `imagesRoutes`)
- edited `backend/package.json` (add `pdf-lib`)

Frontend:
- edited `src/lib/editor-types.ts` (new fields)
- edited `src/lib/editor-store.ts` (defaults for new fields)
- edited `src/components/editor/PropertiesPanel.tsx` (new controls)
- edited `src/components/editor/Canvas.tsx` (render new fields)
- edited `src/routes/api-docs.tsx` (rewritten to match real API)

## Open questions
1. **Synchronous mode**: return the rendered image bytes inline (`image/png` body) or JSON with `image_url` like async? Bannerbear does JSON — I'd match that.
2. **PDF output**: do you want `render_pdf` wired end-to-end now (adds `pdf-lib` dep and ~200kb to the worker bundle), or stubbed with a 501 for this pass?
3. **Chart / QR / barcode layers**: add them as stub layer types + editor tools, or omit entirely for now? The plan currently omits them.
