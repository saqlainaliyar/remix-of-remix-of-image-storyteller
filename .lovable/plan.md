## Goal
Match Illustrator's gradient-with-mask look: soft edge on the **top only**, strong/opaque bottom, working blend modes, and finer feather control. Update the public API docs accordingly (no schema change required).

## 1. Feather = top edge only
**`src/components/editor/Canvas.tsx` → `RenderGradient`**
Replace the current 4-sided rect / ellipse mask with a single top-only vertical mask:
```
mask-image / -webkit-mask-image:
  linear-gradient(to bottom, transparent 0, #000 {feather}px, #000 100%)
```
Drop the ellipse/rect branch from the visual mask. The top-drag feather handle in `GradientHandles` stays as-is.

**`backend/src/templates/render.ts` → `drawFeatherMask`**
Rewrite to a top-only alpha mask via `destination-in` on the offscreen canvas:
- `createLinearGradient(0, 0, 0, feather)` transparent → opaque, filled across the top band `[0, feather]`.
- Opaque rect across `[feather, h]`.
Remove the ellipse branch.

## 2. Fix blend mode not working
Root cause: `mixBlendMode` is set on the inner gradient `<div>` inside `LayerView`, so it blends against its own transparent wrapper, never against layers below.

**`Canvas.tsx` → `LayerView`**
- Move `mixBlendMode` (for gradient layers) onto the outer wrapper `div` that carries `common` styles.
- Remove `mixBlendMode` from `RenderGradient`'s inner div.
- Do not add `isolation: isolate` on the stage.

Backend renderer already applies `globalCompositeOperation` on the main context — no change needed there.

## 3. Stronger color at the bottom
**`src/lib/editor-store.ts` → `addLayer("gradient", …)` defaults**
New gradient layers default to a vertical linear gradient with transparent top and opaque bottom:
```
angle: 180,
stops: [
  { color: "#000000", position: 0,   opacity: 0 },
  { color: "#111111", position: 100, opacity: 1 },
]
```
Pairs naturally with top-only feather.

**`PropertiesPanel.tsx`**
Add a small **"Bottom emphasis"** button near Reset that, without discarding user colors, sets the last stop to `opacity: 1` / `position ≥ 85` and fades the first stop's `opacity` toward `0`.

## 4. Soft feather adjust (finer control)
**`src/lib/editor-types.ts`**
Add `featherSoftness: number` (default `1`, range `0.2–3`) to `GradientLayer`. Keep `featherShape` in the type for save-file compat, marked deprecated in a comment; renderers ignore it.

**`Canvas.tsx` & `render.ts`**
The mid-stop of the top-mask gradient becomes `feather * featherSoftness` px (clamped to `≤ height`). Values <1 give a harder edge, >1 give a softer, extended falloff.

**`PropertiesPanel.tsx`**
- Keep Feather slider (add step `0.5`, existing numeric input).
- Add **Softness** slider (0.2–3, step 0.05, default 1), visible only when `feather > 0`.
- Remove the Edge Shape (Rect/Ellipse) segmented control since feather is now top-only.
- Include `feather: 0`, `featherSoftness: 1` in Reset defaults.

## 5. API endpoint
`PATCH /api/v1/templates/:id/layers/:name` already deep-merges arbitrary fields, so `{ "feather": 24, "featherSoftness": 1.4 }` flows through — no route change.

**`src/routes/api-docs.tsx`** — Gradient layer section:
- Document `feather` as **top-edge only** soft mask.
- Add `featherSoftness` (0.2–3, default 1).
- Mark `featherShape` as deprecated / ignored by the renderer.

## Files touched
Edited: `src/lib/editor-types.ts`, `src/lib/editor-store.ts`, `src/components/editor/Canvas.tsx`, `src/components/editor/PropertiesPanel.tsx`, `backend/src/templates/render.ts`, `src/routes/api-docs.tsx`.

## Out of scope
Per-edge feather on other sides, image/text feather, animated/keyframed feather.
