import type { CanvasPreset } from "./editor-types";

export const CANVAS_PRESETS: CanvasPreset[] = [
  { id: "yt-thumb", name: "YouTube Thumbnail", width: 1280, height: 720, category: "Video" },
  { id: "yt-short", name: "YouTube Short / Reel", width: 1080, height: 1920, category: "Video" },
  { id: "ig-post", name: "Instagram Post", width: 1080, height: 1080, category: "Instagram" },
  { id: "ig-story", name: "Instagram Story", width: 1080, height: 1920, category: "Instagram" },
  { id: "ig-portrait", name: "Instagram Portrait", width: 1080, height: 1350, category: "Instagram" },
  { id: "li-post", name: "LinkedIn Post", width: 1200, height: 627, category: "LinkedIn" },
  { id: "li-cover", name: "LinkedIn Cover", width: 1584, height: 396, category: "LinkedIn" },
  { id: "fb-post", name: "Facebook Post", width: 1200, height: 630, category: "Facebook" },
  { id: "fb-cover", name: "Facebook Cover", width: 851, height: 315, category: "Facebook" },
  { id: "x-post", name: "X / Twitter Post", width: 1600, height: 900, category: "X" },
  { id: "x-header", name: "X / Twitter Header", width: 1500, height: 500, category: "X" },
  { id: "pin", name: "Pinterest Pin", width: 1000, height: 1500, category: "Pinterest" },
  { id: "blog", name: "Blog Header", width: 1600, height: 900, category: "Web" },
  { id: "og", name: "Open Graph", width: 1200, height: 630, category: "Web" },
  { id: "square", name: "Square 1:1", width: 1080, height: 1080, category: "Custom" },
];

export const FONT_FAMILIES = [
  "Inter",
  "Big Shoulders Display",
  "Anton",
  "Bebas Neue",
  "Archivo Black",
  "Oswald",
  "Montserrat",
  "Poppins",
  "Playfair Display",
  "DM Serif Display",
  "Space Grotesk",
  "JetBrains Mono",
  "Lora",
  "Roboto",
];
