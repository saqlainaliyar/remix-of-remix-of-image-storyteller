## Scope

Four targeted changes to the editor — no API/backend changes.

### 1. Full gradient control

Add a reusable gradient model and picker, wired into every color field that should support it.

- New types in `src/lib/editor-types.ts`:
  - `Gradient = { type: "linear" | "radial"; angle: number; stops: { color: string; position: number }[] }`
  - `Fill = string | Gradient` (string keeps `"transparent"` and hex backwards-compatible)
  - Switch `BackgroundLayer.color`, `TextStyle.color`, and `TextStyle.bgColor` to `Fill`.
- Helpers in a new `src/lib/fill.ts`:
  - `fillToCSS(fill)` → CSS color or `linear-gradient(...)` / `radial-gradient(...)` string.
  - `fillToTextCSS(fill)` → for text color, returns either `{ color }` or `{ backgroundImage, WebkitBackgroundClip: "text", color: "transparent" }`.
- New `FillInput` component in `PropertiesPanel.tsx` replacing `ColorInput` everywhere a Fill is used:
  - Tabs: Solid / Linear / Radial / Transparent.
  - Linear/Radial: angle slider (0–360°), list of stops with color picker + position (0–100), add/remove stop, min 2 stops.
  - Live preview swatch.
- Update `Canvas.tsx` `RenderBackground` and `text-render.tsx` `styleToCSS` to consume Fill via the new helpers (text color uses background-clip when gradient).
- Migrate existing stored templates lazily: any string color stays a string; only new gradients use the object form.

### 2. Remove extra transparent area in workspace

In `src/components/editor/Canvas.tsx`:
- Drop the `checker-bg` class on the outer scroll container; use a subtle neutral workspace surface (e.g. `bg-muted/40`).
- Keep the checker pattern *inside* the canvas frame only (so transparent areas of the design itself still read as transparent), via an inner absolutely-positioned checker layer behind the stage.
- Tighten padding from `p-8` to `p-6` and remove the `shadow-2xl` outer wrapper's extra footprint — wrapper sized exactly to `template.width * zoom × template.height * zoom`.

Result: workspace looks clean (light neutral), and only the actual canvas bounds show the transparency checker when relevant.

### 3. Fix extra space between highlighted word and neighbour

In `src/components/editor/text-render.tsx`:
- When walking segments, trim exactly one leading/trailing space from a non-highlight segment that is adjacent to a highlight segment. The highlight's horizontal padding (`bgPaddingX`) then provides the visual separation, eliminating the double-gap (`space + padding`).
- Keep internal spaces untouched.

### 4. Wrap second line to the left while keeping layer alignment

Still in `text-render.tsx`:
- Change the inner per-line wrapper to `display: inline-block; text-align: left; max-width: 100%`, and keep the outer flex container responsible for horizontal placement (`justifyContent` from `layer.align`).
- Effect: the line as a whole is placed per `align`, but when it wraps the continuation flows from the left edge of that block instead of being re-centered by the browser.
- Use `align-items: flex-start | center | flex-end` on the outer column to honour `layer.align` for the block, not for each visual wrap line.

## Technical notes

- No store shape change beyond `Fill` widening; reducers don't need updates.
- `html-to-image` export already handles `background-clip: text` — no export changes needed.
- All edits limited to: `editor-types.ts`, new `fill.ts`, `text-render.tsx`, `Canvas.tsx`, `PropertiesPanel.tsx`.

## Out of scope

- No new layer types, no backend, no batch/API changes.
- Gradient on image border / shadow color (can be a follow-up).
