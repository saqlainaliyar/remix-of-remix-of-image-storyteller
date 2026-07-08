import { create } from "zustand";
import type { Layer, Template, TextLayer, ImageLayer, BackgroundLayer, GradientLayer, TextStyle } from "./editor-types";

const uid = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_PRIMARY: TextStyle = {
  color: "#ffffff",
  fontWeight: 800,
  fontStyle: "normal",
  textDecoration: "none",
  textTransform: "uppercase",
  bgColor: "#000000",
  bgPaddingX: 18,
  bgPaddingY: 6,
  bgRadius: 0,
  shadow: "none",
};

const DEFAULT_SECONDARY: TextStyle = {
  ...DEFAULT_PRIMARY,
  color: "#13ffb3",
  bgColor: "#000000",
};

export function makeDefaultTemplate(width = 1280, height = 720): Template {
  const bg: BackgroundLayer = {
    id: uid(),
    type: "background",
    name: "background",
    x: 0,
    y: 0,
    width,
    height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    color: "#13ffb3",
    imageFit: "cover",
  };

  const title: TextLayer = {
    id: uid(),
    type: "text",
    name: "title",
    x: Math.round(width * 0.08),
    y: Math.round(height * 0.62),
    width: Math.round(width * 0.84),
    height: Math.round(height * 0.3),
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    text: "Content That Actually *Drives Sales*",
    fontFamily: "Big Shoulders Display",
    fontSize: 88,
    letterSpacing: 0,
    lineHeight: 1.05,
    align: "center",
    autoFit: true,
    primary: { ...DEFAULT_PRIMARY },
    secondary: { ...DEFAULT_SECONDARY },
  };

  const pretitle: TextLayer = {
    id: uid(),
    type: "text",
    name: "pretitle",
    x: Math.round(width * 0.32),
    y: Math.round(height * 0.18),
    width: Math.round(width * 0.36),
    height: Math.round(height * 0.14),
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    text: "The Marketing\nPodcast",
    fontFamily: "Big Shoulders Display",
    fontSize: 44,
    letterSpacing: 1,
    lineHeight: 1,
    align: "center",
    autoFit: true,
    primary: {
      color: "#0a0a0a",
      fontWeight: 800,
      fontStyle: "normal",
      textDecoration: "none",
      textTransform: "uppercase",
      bgColor: "#ffffff",
      bgPaddingX: 22,
      bgPaddingY: 10,
      bgRadius: 0,
      shadow: "none",
    },
    secondary: { ...DEFAULT_SECONDARY },
  };

  return {
    id: uid(),
    name: "Untitled Template",
    width,
    height,
    layers: [bg, pretitle, title],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

interface EditorState {
  template: Template;
  selectedId: string | null;
  zoom: number;
  showGuides: boolean;
  history: Template[];
  future: Template[];

  setTemplate: (t: Template) => void;
  setName: (n: string) => void;
  setSize: (w: number, h: number) => void;
  select: (id: string | null) => void;
  setZoom: (z: number) => void;
  toggleGuides: () => void;

  addLayer: (kind: "text" | "image" | "gradient") => void;
  updateLayer: (id: string, patch: Partial<Layer>) => void;
  updateText: (id: string, patch: Partial<TextLayer>) => void;
  updateImage: (id: string, patch: Partial<ImageLayer>) => void;
  updateBackground: (id: string, patch: Partial<BackgroundLayer>) => void;
  updateGradient: (id: string, patch: Partial<GradientLayer>) => void;
  removeLayer: (id: string) => void;
  duplicateLayer: (id: string) => void;
  reorder: (id: string, dir: "up" | "down") => void;
  toggleVisible: (id: string) => void;
  toggleLock: (id: string) => void;

  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
}

const cloneTemplate = (t: Template): Template => JSON.parse(JSON.stringify(t));

export const useEditor = create<EditorState>((set, get) => ({
  template: makeDefaultTemplate(),
  selectedId: null,
  zoom: 0.5,
  showGuides: true,
  history: [],
  future: [],

  setTemplate: (t) => set({ template: t, selectedId: null, history: [], future: [] }),
  setName: (name) => set((s) => ({ template: { ...s.template, name, updatedAt: Date.now() } })),
  setSize: (width, height) => {
    get().pushHistory();
    set((s) => ({
      template: {
        ...s.template,
        width,
        height,
        layers: s.template.layers.map((l) =>
          l.type === "background" ? { ...l, width, height } : l
        ),
        updatedAt: Date.now(),
      },
    }));
  },
  select: (id) => set({ selectedId: id }),
  setZoom: (z) => set({ zoom: Math.max(0.1, Math.min(2, z)) }),
  toggleGuides: () => set((s) => ({ showGuides: !s.showGuides })),

  pushHistory: () =>
    set((s) => ({
      history: [...s.history.slice(-49), cloneTemplate(s.template)],
      future: [],
    })),

  addLayer: (kind) => {
    get().pushHistory();
    set((s) => {
      const id = uid();
      const w = s.template.width;
      const h = s.template.height;
      const layer: Layer =
        kind === "text"
          ? {
              id,
              type: "text",
              name: `text-${s.template.layers.length}`,
              x: Math.round(w * 0.15),
              y: Math.round(h * 0.4),
              width: Math.round(w * 0.7),
              height: Math.round(h * 0.2),
              rotation: 0,
              opacity: 1,
              visible: true,
              locked: false,
              text: "Your Text Here",
              fontFamily: "Inter",
              fontSize: 64,
              letterSpacing: 0,
              lineHeight: 1.1,
              align: "center",
              autoFit: true,
              primary: { ...DEFAULT_PRIMARY, bgColor: "transparent", color: "#0a0a0a" },
              secondary: { ...DEFAULT_SECONDARY, bgColor: "transparent" },
            }
          : kind === "image"
          ? {
              id,
              type: "image",
              name: `image-${s.template.layers.length}`,
              x: Math.round(w * 0.2),
              y: Math.round(h * 0.2),
              width: Math.round(w * 0.4),
              height: Math.round(h * 0.4),
              rotation: 0,
              opacity: 1,
              visible: true,
              locked: false,
              imageUrl: undefined,
              fit: "cover",
              mask: "none",
              radius: 0,
              borderColor: "#000000",
              borderWidth: 0,
            }
          : {
              id,
              type: "gradient",
              name: `gradient-${s.template.layers.length}`,
              x: 0,
              y: 0,
              width: w,
              height: h,
              rotation: 0,
              opacity: 1,
              visible: true,
              locked: false,
              gradient: {
                type: "linear",
                angle: 180,
                stops: [
                  { color: "#000000", position: 0, opacity: 0 },
                  { color: "#111111", position: 100, opacity: 1 },
                ],
              },
              blendMode: "normal",
              scale: 1,
              reversed: false,
              feather: 0,
              featherSoftness: 1,
              featherShape: "rect",
            };
      return {
        template: { ...s.template, layers: [...s.template.layers, layer], updatedAt: Date.now() },
        selectedId: id,
      };
    });
  },

  updateLayer: (id, patch) => {
    set((s) => ({
      template: {
        ...s.template,
        layers: s.template.layers.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l)),
        updatedAt: Date.now(),
      },
    }));
  },
  updateText: (id, patch) => get().updateLayer(id, patch as Partial<Layer>),
  updateImage: (id, patch) => get().updateLayer(id, patch as Partial<Layer>),
  updateBackground: (id, patch) => get().updateLayer(id, patch as Partial<Layer>),
  updateGradient: (id, patch) => get().updateLayer(id, patch as Partial<Layer>),

  removeLayer: (id) => {
    get().pushHistory();
    set((s) => ({
      template: { ...s.template, layers: s.template.layers.filter((l) => l.id !== id) },
      selectedId: s.selectedId === id ? null : s.selectedId,
    }));
  },

  duplicateLayer: (id) => {
    get().pushHistory();
    set((s) => {
      const layer = s.template.layers.find((l) => l.id === id);
      if (!layer) return s;
      const dup: Layer = { ...JSON.parse(JSON.stringify(layer)), id: uid(), name: `${layer.name}-copy`, x: layer.x + 20, y: layer.y + 20 };
      return { template: { ...s.template, layers: [...s.template.layers, dup] }, selectedId: dup.id };
    });
  },

  reorder: (id, dir) => {
    get().pushHistory();
    set((s) => {
      const idx = s.template.layers.findIndex((l) => l.id === id);
      if (idx === -1) return s;
      const layers = [...s.template.layers];
      const swap = dir === "up" ? idx + 1 : idx - 1;
      if (swap < 0 || swap >= layers.length) return s;
      [layers[idx], layers[swap]] = [layers[swap], layers[idx]];
      return { template: { ...s.template, layers } };
    });
  },

  toggleVisible: (id) =>
    set((s) => ({
      template: {
        ...s.template,
        layers: s.template.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
      },
    })),
  toggleLock: (id) =>
    set((s) => ({
      template: {
        ...s.template,
        layers: s.template.layers.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l)),
      },
    })),

  undo: () =>
    set((s) => {
      if (!s.history.length) return s;
      const prev = s.history[s.history.length - 1];
      return {
        template: prev,
        history: s.history.slice(0, -1),
        future: [s.template, ...s.future],
      };
    }),
  redo: () =>
    set((s) => {
      if (!s.future.length) return s;
      const next = s.future[0];
      return {
        template: next,
        history: [...s.history, s.template],
        future: s.future.slice(1),
      };
    }),
}));
