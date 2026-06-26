import type { TextLayer, TextStyle } from "@/lib/editor-types";
import { fillToBackground, fillToTextStyle, isGradient } from "@/lib/fill";
import type { CSSProperties } from "react";

interface Segment {
  content: string;
  highlight: boolean;
}

/**
 * Parses text with *highlighted* spans into ordered segments.
 * Trims one adjacent space on non-highlight segments touching a highlight,
 * so the highlight's horizontal padding becomes the visual separator.
 */
export function parseSegments(text: string): Segment[] {
  const parts: Segment[] = [];
  const regex = /\*([^*]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text))) {
    if (m.index > last) parts.push({ content: text.slice(last, m.index), highlight: false });
    parts.push({ content: m[1], highlight: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ content: text.slice(last), highlight: false });

  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i];
    if (seg.highlight) continue;
    const prev = parts[i - 1];
    const next = parts[i + 1];
    let c = seg.content;
    if (prev?.highlight && c.startsWith(" ")) c = c.slice(1);
    if (next?.highlight && c.endsWith(" ")) c = c.slice(0, -1);
    parts[i] = { ...seg, content: c };
  }
  return parts;
}

export function styleToCSS(s: TextStyle): CSSProperties {
  const textColor = fillToTextStyle(s.color);
  const bgIsTransparent = s.bgColor === "transparent";
  const bgStyle: CSSProperties = bgIsTransparent
    ? { backgroundColor: "transparent" }
    : isGradient(s.bgColor)
      ? { backgroundImage: fillToBackground(s.bgColor) }
      : { backgroundColor: s.bgColor as string };

  // Gradient text uses background-clip:text — can't also paint span background.
  const safeBg = isGradient(s.color) ? { backgroundColor: "transparent" } : bgStyle;

  return {
    ...textColor,
    ...safeBg,
    fontWeight: s.fontWeight,
    fontStyle: s.fontStyle,
    textDecoration: s.textDecoration,
    textTransform: s.textTransform,
    paddingTop: s.bgPaddingY,
    paddingBottom: s.bgPaddingY,
    paddingLeft: s.bgPaddingX,
    paddingRight: s.bgPaddingX,
    borderRadius: s.bgRadius,
    textShadow: s.shadow,
    boxDecorationBreak: "clone",
    WebkitBoxDecorationBreak: "clone",
  };
}

export function renderText(layer: TextLayer) {
  const lines = layer.text.split("\n");
  const alignItems =
    layer.align === "left" ? "flex-start" : layer.align === "right" ? "flex-end" : "center";
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems,
        fontFamily: `"${layer.fontFamily}", sans-serif`,
        fontSize: layer.fontSize,
        letterSpacing: layer.letterSpacing,
        lineHeight: layer.lineHeight,
        overflow: "hidden",
      }}
    >
      {lines.map((line, li) => {
        const segs = parseSegments(line || " ");
        return (
          <div
            key={li}
            style={{
              display: "inline-block",
              maxWidth: "100%",
              textAlign: "left",
            }}
          >
            {segs.map((seg, si) => (
              <span key={si} style={styleToCSS(seg.highlight ? layer.secondary : layer.primary)}>
                {seg.content}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
