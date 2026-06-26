import type { CSSProperties } from "react";
import type { Fill, Gradient, GradientStop } from "./editor-types";

export function isGradient(fill: Fill | undefined | null): fill is Gradient {
  return !!fill && typeof fill === "object" && "stops" in fill;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.trim().match(/^#?([a-f\d]{3}|[a-f\d]{6})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function stopColor(stop: GradientStop): string {
  const op = stop.opacity ?? 1;
  if (op >= 1) return stop.color;
  const rgb = hexToRgb(stop.color);
  if (rgb) return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${op})`;
  // rgb(...)/named — best-effort wrap
  if (stop.color.startsWith("rgb(")) {
    return stop.color.replace("rgb(", "rgba(").replace(")", `, ${op})`);
  }
  return stop.color;
}

export function gradientToCSS(g: Gradient, reversed = false): string {
  const sorted = [...g.stops].sort((a, b) => a.position - b.position);
  const stops = sorted
    .map((s) => {
      const pos = reversed ? 100 - s.position : s.position;
      return { ...s, position: pos };
    })
    .sort((a, b) => a.position - b.position)
    .map((s) => `${stopColor(s)} ${s.position}%`)
    .join(", ");

  switch (g.type) {
    case "radial":
      return `radial-gradient(circle, ${stops})`;
    case "angular":
      return `conic-gradient(from ${g.angle}deg at 50% 50%, ${stops})`;
    case "diamond":
      // Approximation: conic-gradient with 4-way symmetry feels diamond-like;
      // a true diamond uses crossed linear gradients via mask. Use a radial
      // with an ellipse closest-side which gives a strong diamond-feel falloff.
      return `radial-gradient(closest-side at 50% 50%, ${stops})`;
    case "linear":
    default:
      return `linear-gradient(${g.angle}deg, ${stops})`;
  }
}

/** CSS value for a `background` shorthand (returns gradient or color). */
export function fillToBackground(fill: Fill): string {
  if (isGradient(fill)) return gradientToCSS(fill);
  return fill;
}

/** Style props for text foreground color, supporting gradient via background-clip. */
export function fillToTextStyle(fill: Fill): CSSProperties {
  if (isGradient(fill)) {
    return {
      backgroundImage: gradientToCSS(fill),
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
      WebkitTextFillColor: "transparent",
    };
  }
  return { color: fill };
}

/** Style for a swatch preview square. */
export function fillToSwatch(fill: Fill): CSSProperties {
  if (fill === "transparent") {
    return {
      backgroundImage:
        "repeating-conic-gradient(#e5e7eb 0% 25%, #fff 0% 50%)",
      backgroundSize: "12px 12px",
    };
  }
  return { background: fillToBackground(fill) };
}

export const DEFAULT_LINEAR_GRADIENT: Gradient = {
  type: "linear",
  angle: 90,
  stops: [
    { color: "#4f46e5", position: 0, opacity: 1 },
    { color: "#13ffb3", position: 100, opacity: 1 },
  ],
};
