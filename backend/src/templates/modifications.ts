/**
 * Bannerbear-compatible modification schema. Each modification is keyed by the
 * layer `name` in the template; fields that don't apply to the layer's type
 * are ignored.
 */
export interface Modification {
  name: string;
  // Any layer
  color?: string;
  gradient?: string[]; // ["#000","#FFF"] → 2-stop linear
  shadow?: string;
  border_width?: number;
  border_color?: string;
  shift_x?: number;
  shift_y?: number;
  target?: string;
  hide?: boolean;
  // Text
  text?: string;
  background?: string;
  background_border_color?: string;
  font_family?: string;
  text_align_h?: "left" | "center" | "right";
  text_align_v?: "top" | "center" | "bottom";
  font_family_2?: string;
  color_2?: string;
  // Image
  image_url?: string;
  effect?: "none" | "grayscale" | "sepia" | "blur" | "duotone";
  anchor_x?: "left" | "center" | "right";
  anchor_y?: "top" | "center" | "bottom";
  fill_type?: "fill" | "fit";
  disable_face_detect?: boolean;
  disable_smart_crop?: boolean;
  // Gradient (native)
  feather?: number;
  featherSoftness?: number;
  blendMode?: string;
  stops?: Array<{ color: string; position: number; opacity?: number }>;
  // Passthrough for other fields we already support
  [k: string]: unknown;
}

function fillTypeToFit(v: string | undefined): "cover" | "contain" | undefined {
  if (v === "fill") return "cover";
  if (v === "fit") return "contain";
  return undefined;
}

function gradientArrayToObj(arr: string[]) {
  const step = arr.length > 1 ? 100 / (arr.length - 1) : 100;
  return {
    type: "linear" as const,
    angle: 180,
    stops: arr.map((color, i) => ({
      color,
      position: Math.round(i * step),
      opacity: 1,
    })),
  };
}

/** Apply a single modification to a matched layer, returning a new layer. */
export function applyModification(layer: any, mod: Modification): any {
  const out: any = { ...layer };

  // Any-layer fields
  if (mod.hide !== undefined) out.visible = !mod.hide;
  if (mod.shadow !== undefined) out.shadow = mod.shadow;
  if (mod.border_width !== undefined) out.borderWidth = Number(mod.border_width);
  if (mod.border_color !== undefined) out.borderColor = mod.border_color;
  if (mod.shift_x !== undefined) out.x = (layer.x ?? 0) + Number(mod.shift_x);
  if (mod.shift_y !== undefined) out.y = (layer.y ?? 0) + Number(mod.shift_y);
  if (mod.target !== undefined) out.target = mod.target;
  if (mod.gradient && Array.isArray(mod.gradient) && mod.gradient.length >= 2) {
    // For any layer type: swap the "fill" to the linear gradient.
    if (layer.type === "background") out.color = gradientArrayToObj(mod.gradient);
    else if (layer.type === "gradient") out.gradient = gradientArrayToObj(mod.gradient);
    else out.gradient = gradientArrayToObj(mod.gradient); // stashed for future use
  }

  // Type-specific
  if (layer.type === "text") {
    if (mod.text !== undefined) out.text = mod.text;
    if (mod.font_family !== undefined) out.fontFamily = mod.font_family;
    if (mod.text_align_h !== undefined) out.align = mod.text_align_h;
    if (mod.text_align_v !== undefined) out.verticalAlign = mod.text_align_v;
    if (mod.color !== undefined) {
      out.primary = { ...(out.primary ?? {}), color: mod.color };
    }
    if (mod.color_2 !== undefined) {
      out.secondary = { ...(out.secondary ?? {}), color: mod.color_2 };
    }
    if (mod.font_family_2 !== undefined) {
      out.secondaryFontFamily = mod.font_family_2;
    }
    if (mod.background !== undefined) {
      out.primary = { ...(out.primary ?? {}), bgColor: mod.background };
    }
    if (mod.background_border_color !== undefined) {
      out.primary = {
        ...(out.primary ?? {}),
        bgBorderColor: mod.background_border_color,
      };
    }
  } else if (layer.type === "image") {
    if (mod.image_url !== undefined) out.imageUrl = mod.image_url;
    if (mod.effect !== undefined) out.effect = mod.effect;
    if (mod.anchor_x !== undefined) out.anchorX = mod.anchor_x;
    if (mod.anchor_y !== undefined) out.anchorY = mod.anchor_y;
    const fit = fillTypeToFit(mod.fill_type);
    if (fit) out.fit = fit;
    // face_detect / smart_crop accepted but not implemented yet.
  } else if (layer.type === "background") {
    if (mod.image_url !== undefined) out.imageUrl = mod.image_url;
    if (mod.color !== undefined) out.color = mod.color;
  } else if (layer.type === "gradient") {
    if (mod.feather !== undefined) out.feather = Number(mod.feather);
    if (mod.featherSoftness !== undefined) out.featherSoftness = Number(mod.featherSoftness);
    if (mod.blendMode !== undefined) out.blendMode = mod.blendMode;
    if (mod.stops !== undefined) out.gradient = { ...(out.gradient ?? {}), stops: mod.stops };
    if (mod.color !== undefined) {
      // Recolor first stop
      const stops = (out.gradient?.stops ?? []).map((s: any, i: number) =>
        i === 0 ? { ...s, color: mod.color } : s,
      );
      out.gradient = { ...(out.gradient ?? {}), stops };
    }
  }

  return out;
}

/** Apply an array of modifications against a template's layers. */
export function applyModifications(layers: any[], mods: Modification[]): any[] {
  if (!mods?.length) return layers;
  return layers.map((l) => {
    const m = mods.find((x) => x.name === l.name);
    return m ? applyModification(l, m) : l;
  });
}
