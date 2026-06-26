import type { BrandKit, Template } from "./editor-types";

const TPL_KEY = "bb_templates_v1";
const BRAND_KEY = "bb_brandkit_v1";

export function listTemplates(): Template[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(TPL_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveTemplate(t: Template) {
  const all = listTemplates();
  const idx = all.findIndex((x) => x.id === t.id);
  const next = { ...t, updatedAt: Date.now() };
  if (idx >= 0) all[idx] = next;
  else all.push(next);
  localStorage.setItem(TPL_KEY, JSON.stringify(all));
}

export function deleteTemplate(id: string) {
  const all = listTemplates().filter((t) => t.id !== id);
  localStorage.setItem(TPL_KEY, JSON.stringify(all));
}

export function getTemplate(id: string): Template | undefined {
  return listTemplates().find((t) => t.id === id);
}

const DEFAULT_BRAND: BrandKit = {
  colors: ["#4f46e5", "#0a0a0a", "#13ffb3", "#ffffff", "#f5f6f8"],
  fonts: ["Inter", "Big Shoulders Display"],
  logos: [],
};

export function getBrandKit(): BrandKit {
  if (typeof window === "undefined") return DEFAULT_BRAND;
  try {
    return JSON.parse(localStorage.getItem(BRAND_KEY) || "null") || DEFAULT_BRAND;
  } catch {
    return DEFAULT_BRAND;
  }
}

export function saveBrandKit(k: BrandKit) {
  localStorage.setItem(BRAND_KEY, JSON.stringify(k));
}
