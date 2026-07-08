import { Canvas, loadImage } from "skia-canvas";
import { createHash } from "node:crypto";
import { writeFile, mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { env } from "../env.js";
import { cacheGet, cacheSet } from "../redis.js";
import { pool } from "../db.js";

interface RenderInput {
  id: string;
  userId: string;
  name: string;
  width: number;
  height: number;
  layers: any[];
}

export interface RenderResult {
  success: true;
  imageUrl: string;
  width: number;
  height: number;
}

export async function renderTemplate(input: RenderInput): Promise<RenderResult> {
  const hash = createHash("sha256")
    .update(JSON.stringify({ w: input.width, h: input.height, layers: input.layers }))
    .digest("hex")
    .slice(0, 16);
  const cacheKey = `render:${hash}`;
  const cached = await cacheGet<RenderResult>(cacheKey);
  if (cached) {
    const exportPath = join(env.STORAGE_DIR, "exports", `render-${hash}.png`);
    try { await stat(exportPath); return cached; } catch { /* re-render */ }
  }

  const canvas = new Canvas(input.width, input.height);
  const ctx = canvas.getContext("2d");

  for (const layer of input.layers) {
    if (layer.visible === false) continue;
    ctx.save();
    ctx.globalAlpha = layer.opacity ?? 1;
    if (layer.blendMode && layer.blendMode !== "normal") {
      (ctx as any).globalCompositeOperation = layer.blendMode;
    }
    if (layer.rotation) {
      const cx = (layer.x ?? 0) + (layer.width ?? 0) / 2;
      const cy = (layer.y ?? 0) + (layer.height ?? 0) / 2;
      ctx.translate(cx, cy);
      ctx.rotate(((layer.rotation as number) * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    if (layer.type === "background") {
      await drawBackground(ctx, layer, input.width, input.height);
    } else if (layer.type === "image") {
      await drawImage(ctx, layer);
    } else if (layer.type === "gradient") {
      drawGradient(ctx, layer, input.width, input.height);
    } else if (layer.type === "text") {
      drawText(ctx, layer);
    }

    ctx.restore();
  }

  const buf = await canvas.toBuffer("png");
  const filename = `render-${hash}.png`;
  const exportsDir = join(env.STORAGE_DIR, "exports");
  await mkdir(exportsDir, { recursive: true });
  const filePath = join(exportsDir, filename);
  await writeFile(filePath, buf);

  await pool.query(
    `INSERT INTO assets (user_id, kind, path, filename, width, height, size_bytes, mime)
     VALUES ($1,'export',$2,$3,$4,$5,$6,'image/png')`,
    [input.userId, `/exports/${filename}`, filename, input.width, input.height, buf.length],
  );

  const result: RenderResult = {
    success: true,
    imageUrl: `/exports/${filename}`,
    width: input.width,
    height: input.height,
  };
  await cacheSet(cacheKey, result, 60 * 60);
  return result;
}

async function drawBackground(ctx: any, layer: any, w: number, h: number) {
  if (typeof layer.color === "string") {
    ctx.fillStyle = layer.color;
    ctx.fillRect(0, 0, w, h);
  } else if (layer.color) {
    applyGradientFill(ctx, layer.color, 0, 0, w, h);
    ctx.fillRect(0, 0, w, h);
  }
  if (layer.imageUrl) {
    try {
      const img = await loadImage(resolveAsset(layer.imageUrl));
      drawFittedImage(ctx, img, 0, 0, w, h, layer.imageFit ?? "cover");
    } catch { /* ignore missing */ }
  }
}

async function drawImage(ctx: any, layer: any) {
  if (!layer.imageUrl) return;
  try {
    const img = await loadImage(resolveAsset(layer.imageUrl));
    if (layer.mask === "circle") {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(layer.x + layer.width / 2, layer.y + layer.height / 2, layer.width / 2, layer.height / 2, 0, 0, Math.PI * 2);
      ctx.clip();
    } else if (layer.radius) {
      ctx.save();
      roundRectPath(ctx, layer.x, layer.y, layer.width, layer.height, layer.radius);
      ctx.clip();
    }
    drawFittedImage(ctx, img, layer.x, layer.y, layer.width, layer.height, layer.fit ?? "cover");
    if (layer.mask === "circle" || layer.radius) ctx.restore();
    if (layer.borderWidth > 0) {
      ctx.strokeStyle = layer.borderColor ?? "#000";
      ctx.lineWidth = layer.borderWidth;
      ctx.strokeRect(layer.x, layer.y, layer.width, layer.height);
    }
  } catch { /* missing image */ }
}

function drawGradient(ctx: any, layer: any, _w: number, _h: number) {
  const { x, y, width: w, height: h } = layer;
  const feather = Math.max(0, Number(layer.feather ?? 0));
  if (!feather) {
    applyGradientFill(ctx, layer.gradient, x, y, w, h, layer.reversed);
    ctx.fillRect(x, y, w, h);
    return;
  }
  const softness = Math.max(0.2, Math.min(3, Number(layer.featherSoftness ?? 1)));
  // Render gradient + top-edge feather mask to an offscreen canvas so
  // destination-in does not erase layers beneath this one.
  const off = new Canvas(Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h)));
  const octx: any = off.getContext("2d");
  applyGradientFill(octx, layer.gradient, 0, 0, w, h, layer.reversed);
  octx.fillRect(0, 0, w, h);
  drawFeatherMask(octx, feather, softness, w, h);
  ctx.drawImage(off, x, y);
}

function drawFeatherMask(ctx: any, feather: number, softness: number, w: number, h: number) {
  ctx.save();
  ctx.globalCompositeOperation = "destination-in";
  const mid = Math.min(h, feather * softness);
  // Top band fade: transparent -> opaque
  const grad = ctx.createLinearGradient(0, 0, 0, Math.max(1, mid));
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.5, "rgba(0,0,0,0.5)");
  grad.addColorStop(1, "rgba(0,0,0,1)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, mid);
  // Opaque below the mid stop
  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.fillRect(0, mid, w, Math.max(0, h - mid));
  ctx.restore();
}

function applyGradientFill(ctx: any, g: any, x: number, y: number, w: number, h: number, reversed = false) {
  const stops = (reversed ? [...g.stops].reverse().map((s: any, i: number, arr: any[]) => ({ ...s, position: 100 - s.position })) : g.stops) ?? [];
  let grad: any;
  if (g.type === "radial" || g.type === "diamond") {
    grad = ctx.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, Math.max(w, h) / 2);
  } else if (g.type === "angular" && (ctx as any).createConicGradient) {
    grad = (ctx as any).createConicGradient(((g.angle ?? 0) * Math.PI) / 180, x + w / 2, y + h / 2);
  } else {
    const angle = ((g.angle ?? 90) * Math.PI) / 180;
    const dx = (Math.cos(angle) * w) / 2;
    const dy = (Math.sin(angle) * h) / 2;
    grad = ctx.createLinearGradient(x + w / 2 - dx, y + h / 2 - dy, x + w / 2 + dx, y + h / 2 + dy);
  }
  for (const s of stops) grad.addColorStop(Math.min(1, Math.max(0, s.position / 100)), withAlpha(s.color, s.opacity ?? 1));
  ctx.fillStyle = grad;
}

function withAlpha(hex: string, a: number): string {
  if (a >= 1) return hex;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function drawFittedImage(ctx: any, img: any, x: number, y: number, w: number, h: number, fit: string) {
  const iw = img.width, ih = img.height;
  if (fit === "stretch" || fit === "fill") return ctx.drawImage(img, x, y, w, h);
  const scale = fit === "contain" ? Math.min(w / iw, h / ih) : Math.max(w / iw, h / ih);
  const dw = iw * scale, dh = ih * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function roundRectPath(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawText(ctx: any, layer: any) {
  const style = layer.primary ?? {};
  const fontSize = layer.fontSize ?? 48;
  ctx.font = `${style.fontStyle ?? "normal"} ${style.fontWeight ?? 700} ${fontSize}px "${layer.fontFamily ?? "Inter"}", sans-serif`;
  ctx.textBaseline = "top";
  ctx.textAlign = layer.align ?? "left";
  ctx.fillStyle = typeof style.color === "string" ? style.color : "#000";
  const text = transformText(layer.text ?? "", style.textTransform);
  const lines = text.split("\n");
  const lh = fontSize * (layer.lineHeight ?? 1.1);
  const ax = layer.align === "center" ? layer.x + layer.width / 2 : layer.align === "right" ? layer.x + layer.width : layer.x;
  lines.forEach((line, i) => ctx.fillText(line, ax, layer.y + i * lh));
}

function transformText(t: string, transform: string | undefined) {
  switch (transform) {
    case "uppercase": return t.toUpperCase();
    case "lowercase": return t.toLowerCase();
    case "capitalize": return t.replace(/\b\w/g, (c) => c.toUpperCase());
    default: return t;
  }
}

function resolveAsset(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
  const p = url.startsWith("/") ? url.slice(1) : url;
  return join(env.STORAGE_DIR, p);
}
