# Gradient Overlay Layer + Layer Type Picker

## 1. New layer type: `gradient`

Extend `src/lib/editor-types.ts`:

- `LayerType` adds `"gradient"`.
- `Gradient` gains `type: "linear" | "radial" | "angular" | "diamond"` and per-stop `opacity` (0–1).
- New `GradientLayer extends BaseLayer`:
  - `gradient: Gradient`
  - `blendMode: "normal" | "multiply" | "screen" | "overlay" | "soft-light" | "hard-light" | "color-dodge" | "color-burn" | "darken" | "lighten" | "difference" | "exclusion"`
  - `scale: number` (1 = fits layer box), `reversed: boolean`
  - Start/end points are derived from the layer box + `rotation` + `scale` (no separate coords needed — angle handles linear/conic, radius handles radial/diamond).
- Union `Layer` includes `GradientLayer`.

## 2. Store changes (`src/lib/editor-store.ts`)

- `addLayer(kind: "text" | "image" | "gradient")` — gradient default: full-canvas box, linear 90°, two stops (`#000` 0%, `#fff` 100%, opacity 1), blend `normal`, opacity 1, scale 1.
- `updateGradient(id, patch: Partial<GradientLayer>)` helper.
- Duplicate/visibility/lock/reorder already generic — no changes.

## 3. Rendering (`src/components/editor/Canvas.tsx` + helper)

- Add `RenderGradient({ layer })`:
  - Builds CSS via a new `gradientLayerToCSS(layer)`:
    - linear → `linear-gradient(angle, stops)`
    - radial → `radial-gradient(circle <scale*50%>, stops)`
    - angular → `conic-gradient(from <angle>deg at 50% 50%, stops)`
    - diamond → CSS-only approximation via two crossed `linear-gradient`s composited with `mask`, OR `conic-gradient` with hard stops (acceptable approximation).
  - Per-stop opacity baked into stop color via `rgba()` conversion.
  - `reversed` flips stop positions.
  - Outer wrapper applies `mixBlendMode: layer.blendMode`, `opacity`, `transform: rotate()`, `willChange: transform, opacity` (GPU hint).
- When selected, render gradient handles overlay (see §4) inside the same selection chrome that text/image layers use.

## 4. On-canvas gradient handles

New `GradientHandles` component rendered inside the selection overlay when `layer.type === "gradient"`:

- Linear/Diamond/Angular: a line from layer-box center along the angle vector, with two draggable end caps (start/end) — dragging updates `rotation` and `scale` (distance / half-diagonal).
- Radial: center dot + one radius handle on the right edge — drags update `scale`.
- Drag math reuses the existing `dragState` pattern but with a third `mode: "gradient"`. Snap to 0/45/90/135° when shift held; snap to canvas center when within 8px.

## 5. Layer creation flow

- `LayersPanel` "+" button opens a small popover with four choices: Image, Text, Shape (disabled, "coming soon"), Gradient. Existing Text/Image icon shortcuts remain.
- Selecting Gradient calls `addLayer("gradient")` and auto-selects the new layer, which makes `PropertiesPanel` show the gradient editor — no extra "tool" state needed.

## 6. Properties panel (`src/components/editor/PropertiesPanel.tsx`)

Add `GradientProps({ layer })`:

- Type select (Linear / Radial / Angular / Diamond) — switching keeps stops.
- Reuses existing `GradientEditor` stop UI, extended with a per-stop opacity slider and a delete button when >2 stops.
- Sliders: global Opacity (already in PositionBlock), Rotation (existing), Scale (0.25–4).
- Blend mode `<Select>` with all 12 modes listed in §1.
- Reverse toggle button.
- Reset button → restores default linear gradient at current size.

Wire `layer?.type === "gradient" && <GradientProps layer={layer} />` next to the existing branches.

## 7. Fix secondary style padding

In `src/components/editor/text-render.tsx` the secondary (`*highlighted*`) span currently inherits asymmetric horizontal padding because the inline `<span>` only paints background on the first/last line and ignores `paddingRight` on line wraps. Fix:

- Render secondary segments with `boxDecorationBreak: "clone"` and `WebkitBoxDecorationBreak: "clone"`.
- Apply `paddingLeft: bgPaddingX` and `paddingRight: bgPaddingX` explicitly (not shorthand) so both sides always match.
- Add a small negative `marginLeft`/`marginRight` equal to `bgPaddingX` only when the segment is at line start/end so the text baseline aligns with primary text — handled by wrapping segment in an inline-block when `bgPaddingX > 0`.

## 8. Export

`html-to-image` already serializes inline styles, so gradient layers export correctly. Verify by exporting a PNG with a radial overlay; no code change expected.

## Technical notes

- Blend modes use CSS `mix-blend-mode`, which composites against sibling layers in the same stacking context — the stage div already provides one (`overflow: hidden`).
- Per-stop opacity is converted to `rgba` at render time; the picker stays `<input type=color>` + a 0–100 opacity slider.
- No new dependencies. All work is client-side.

## Files touched

- `src/lib/editor-types.ts` — new types
- `src/lib/editor-store.ts` — addLayer/updateGradient
- `src/lib/fill.ts` — extend gradient CSS for angular/diamond + opacity stops
- `src/components/editor/Canvas.tsx` — RenderGradient, GradientHandles, gradient drag mode
- `src/components/editor/LayersPanel.tsx` — layer-type popover, gradient icon
- `src/components/editor/PropertiesPanel.tsx` — GradientProps + stop opacity
- `src/components/editor/text-render.tsx` — symmetric secondary padding fix

## Out of scope (flagged as future)

- Freeform/Mesh gradients
- Saving gradient presets to a Brand Kit (could follow once Cloud is enabled)
