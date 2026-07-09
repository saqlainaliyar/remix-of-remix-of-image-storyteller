export type LayerType = "background" | "image" | "text" | "gradient";

export interface BaseLayer {
  id: string;
  type: LayerType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  /** Bannerbear-compatible extras — applied on top of type-specific rendering. */
  shadow?: string;
  shiftX?: number;
  shiftY?: number;
  target?: string; // click URL for PDF renders
  borderColor?: string;
  borderWidth?: number;
}

export type ImageFit = "cover" | "contain" | "fill" | "stretch";
export type MaskShape = "none" | "rounded" | "circle";

export interface GradientStop {
  color: string;
  position: number; // 0..100
  opacity?: number; // 0..1, default 1
}
export type GradientType = "linear" | "radial" | "angular" | "diamond";
export interface Gradient {
  type: GradientType;
  angle: number; // degrees, used for linear / angular / diamond
  stops: GradientStop[];
}
/** A solid color string (hex / rgb / "transparent") or a gradient. */
export type Fill = string | Gradient;

export type BlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "soft-light"
  | "hard-light"
  | "color-dodge"
  | "color-burn"
  | "darken"
  | "lighten"
  | "difference"
  | "exclusion";

/** @deprecated Feather is now top-edge only; kept for save-file compat. */
export type FeatherShape = "rect" | "ellipse";

export interface GradientLayer extends BaseLayer {
  type: "gradient";
  gradient: Gradient;
  blendMode: BlendMode;
  scale: number; // 0.25..4, default 1
  reversed: boolean;
  feather: number; // px, default 0; TOP-edge soft mask (Illustrator style)
  featherSoftness: number; // 0.2..3, default 1; falloff curve for the top mask
  /** @deprecated Ignored by renderers — feather is top-only now. */
  featherShape?: FeatherShape;
}

export interface BackgroundLayer extends BaseLayer {
  type: "background";
  color: Fill;
  imageUrl?: string;
  imageFit: ImageFit;
}

export type ImageEffect = "none" | "grayscale" | "sepia" | "blur" | "duotone";
export type AnchorX = "left" | "center" | "right";
export type AnchorY = "top" | "center" | "bottom";

export interface ImageLayer extends BaseLayer {
  type: "image";
  imageUrl?: string;
  fit: ImageFit;
  mask: MaskShape;
  radius: number;
  borderColor: string;
  borderWidth: number;
  effect?: ImageEffect;
  anchorX?: AnchorX;
  anchorY?: AnchorY;
}

export type TextAlign = "left" | "center" | "right";
export type TextTransform = "none" | "uppercase" | "lowercase" | "capitalize";
export type FontWeight = 300 | 400 | 500 | 600 | 700 | 800 | 900;

export interface TextStyle {
  color: Fill;
  fontWeight: FontWeight;
  fontStyle: "normal" | "italic";
  textDecoration: "none" | "underline" | "line-through";
  textTransform: TextTransform;
  bgColor: Fill;
  bgPaddingX: number;
  bgPaddingY: number;
  bgRadius: number;
  shadow: string; // CSS text-shadow
}

export interface TextLayer extends BaseLayer {
  type: "text";
  text: string; // wrap *highlighted* parts with *...*
  fontFamily: string;
  fontSize: number;
  letterSpacing: number;
  lineHeight: number;
  align: TextAlign;
  autoFit: boolean;
  primary: TextStyle;
  secondary: TextStyle;
}

export type Layer = BackgroundLayer | ImageLayer | TextLayer | GradientLayer;

export interface CanvasPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  category: string;
}

export interface Template {
  id: string;
  name: string;
  width: number;
  height: number;
  layers: Layer[];
  createdAt: number;
  updatedAt: number;
  thumbnail?: string;
}

export interface BrandKit {
  colors: string[];
  fonts: string[];
  logos: { id: string; name: string; url: string }[];
}
