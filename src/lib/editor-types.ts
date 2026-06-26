export type LayerType = "background" | "image" | "text";

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
}

export type ImageFit = "cover" | "contain" | "fill" | "stretch";
export type MaskShape = "none" | "rounded" | "circle";

export interface GradientStop {
  color: string;
  position: number; // 0..100
}
export interface Gradient {
  type: "linear" | "radial";
  angle: number; // degrees, used for linear
  stops: GradientStop[];
}
/** A solid color string (hex / rgb / "transparent") or a gradient. */
export type Fill = string | Gradient;

export interface BackgroundLayer extends BaseLayer {
  type: "background";
  color: Fill;
  imageUrl?: string;
  imageFit: ImageFit;
}

export interface ImageLayer extends BaseLayer {
  type: "image";
  imageUrl?: string;
  fit: ImageFit;
  mask: MaskShape;
  radius: number;
  borderColor: string;
  borderWidth: number;
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

export type Layer = BackgroundLayer | ImageLayer | TextLayer;

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
