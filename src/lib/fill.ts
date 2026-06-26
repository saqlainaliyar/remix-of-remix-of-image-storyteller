import type { CSSProperties } from "react";
import type { Fill, Gradient } from "./editor-types";

export function isGradient(fill: Fill | undefined | null): fill is Gradient {
  return !!fill && typeof fill === "object" && "stops" in fill;
}

export function gradientToCSS(g: Gradient): string {
  const stops = [...g.stops]
    .sort((a, b) => a.position - b.position)
    .map((s) => `${s.color} ${s.position}%`)
    .join(", ");
  if (g.type === "radial") {
    return `radial-gradient(circle, ${stops})`;
  }
  return `linear-gradient(${g.angle}deg, ${stops})`;
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
    { color: "#4f46e5", position: 0 },
    { color: "#13ffb3", position: 100 },
  ],
};
