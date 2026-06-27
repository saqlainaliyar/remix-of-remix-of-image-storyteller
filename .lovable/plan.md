## Goal
Add an Illustrator-style **Feather (Soft Edges)** control to gradient layers so the layer's rectangular boundary fades smoothly into transparency instead of showing a hard cutoff. Wire it through the type system, the canvas renderer, the properties panel, the backend renderer, and the public `/api/v1` patch endpoint.

## Behavior
- New per-gradient-layer property `feather: number` (px, default `0`, range `0–min(width,height)/2`).
- Feather is **separate from** gradient color stops — it only softens the outer edge of the layer rectangle, regardless of gradient type (linear / radial / angular / diamond).
- Optional `featherShape: "rect" | "ellipse"` (default `"rect"`) so radial/diamond gradients can feather as an ellipse for a cleaner Illustrator-like falloff.
- Non-destructive: stored on the layer, fully editable, no baked pixels.

## Implementation

### 1. Types (`src/lib/editor-types.ts`)
Add to `GradientLayer`:
```ts
feather: number;            // px, default 0
featherShape: "rect" | "ellipse"; // default "rect"
```

### 2. Frontend render (`src/components/editor/Canvas.tsx`)
In `RenderGradient`, when `feather > 0` apply a CSS mask that fades the alpha at the border. GPU-accelerated, no canvas rasterization.

- `featherShape: "rect"` — composite two linear `mask-image` gradients (horizontal + vertical) with `mask-composite: intersect`, sized so the opaque core inset equals `feather` px on each side.
- `featherShape: "ellipse"` — single `radial-gradient` mask, opaque to `(100% - featherRatio)`, transparent at 100%.
- Use both `maskImage` and `WebkitMaskImage` for Safari.

### 3. Properties panel (`src/components/editor/PropertiesPanel.tsx`)
In `GradientProps`, add below Blend Mode:
- **Feather** slider (`0`–`min(w,h)/2`, step 1) with numeric input.
- **Edge Shape** segmented control (Rectangle / Ellipse), visible only when `feather > 0`.
- Include `feather` + `featherShape` in the Reset button defaults (`0`, `"rect"`).

### 4. Backend renderer (`backend/src/templates/render.ts`)
In `drawGradient`, after filling the rect, apply the same feather as an alpha mask using `destination-in`:
```ts
if (layer.feather > 0) {
  // draw a radial or rect-with-soft-edges alpha mask using
  // ctx.globalCompositeOperation = "destination-in"
}
```
- Rect feather: draw 4 linear gradients (one per edge) into an offscreen canvas, or use `ctx.filter = "blur(...)"` on a solid rect inset by `feather`.
- Ellipse feather: single `createRadialGradient` from opaque core to transparent edge.
Wrapped in `ctx.save()/restore()` so it doesn't affect later layers.

### 5. Public API (`backend/src/v1/routes.ts`)
No schema change needed — `PATCH /api/v1/templates/:id/layers/:name` already uses `deepMerge` over arbitrary fields, so `{ "feather": 24, "featherShape": "ellipse" }` works automatically. Document the two new fields in `src/routes/api-docs.tsx` under the Gradient layer section.

### 6. Defaults & migration
- `addLayer("gradient", ...)` in `src/lib/editor-store.ts`: initialize `feather: 0`, `featherShape: "rect"`.
- Existing saved templates without these fields: treat missing as `0` / `"rect"` in both renderers (defensive `??`).

## Files touched
**Edited**: `src/lib/editor-types.ts`, `src/lib/editor-store.ts`, `src/components/editor/Canvas.tsx`, `src/components/editor/PropertiesPanel.tsx`, `backend/src/templates/render.ts`, `src/routes/api-docs.tsx`.

## Out of scope
- Per-edge feather amounts (single uniform value for now).
- Feather on image/text layers (gradient layers only this round).
- Animated/keyframed feather.
