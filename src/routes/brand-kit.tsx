import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { getBrandKit, saveBrandKit } from "@/lib/storage";
import type { BrandKit } from "@/lib/editor-types";
import { FONT_FAMILIES } from "@/lib/canvas-presets";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/brand-kit")({
  head: () => ({
    meta: [
      { title: "Brand Kit — Frameforge" },
      { name: "description", content: "Saved brand colors, fonts, and logos." },
    ],
  }),
  component: BrandKitPage,
});

function BrandKitPage() {
  const [kit, setKit] = useState<BrandKit>({ colors: [], fonts: [], logos: [] });
  useEffect(() => setKit(getBrandKit()), []);
  const update = (next: BrandKit) => { setKit(next); saveBrandKit(next); };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-10 px-6 py-12">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">Brand Kit</h1>
          <p className="mt-1 text-sm text-muted-foreground">Reuse colors, fonts, and logos across every template.</p>
        </header>

        <section className="rounded-xl border border-border bg-panel p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Colors</h2>
            <button
              onClick={() => update({ ...kit, colors: [...kit.colors, "#4f46e5"] })}
              className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-xs hover:bg-accent"
            >
              <Plus className="h-3 w-3" /> Add color
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {kit.colors.map((c, i) => (
              <div key={i} className="group relative">
                <label className="block">
                  <div className="h-16 w-16 rounded-lg border border-border" style={{ background: c }} />
                  <input
                    type="color"
                    value={c}
                    onChange={(e) => {
                      const next = [...kit.colors]; next[i] = e.target.value;
                      update({ ...kit, colors: next });
                    }}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </label>
                <div className="mt-1 text-center font-mono text-[10px] text-muted-foreground">{c}</div>
                <button
                  onClick={() => update({ ...kit, colors: kit.colors.filter((_, j) => j !== i) })}
                  className="absolute -right-1 -top-1 hidden rounded-full bg-background p-0.5 text-destructive shadow group-hover:block"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-panel p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Fonts</h2>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
            {FONT_FAMILIES.map((f) => {
              const on = kit.fonts.includes(f);
              return (
                <button
                  key={f}
                  onClick={() => update({ ...kit, fonts: on ? kit.fonts.filter((x) => x !== f) : [...kit.fonts, f] })}
                  className={`rounded-md border px-3 py-2 text-sm transition ${on ? "border-primary bg-accent text-accent-foreground" : "border-input hover:bg-accent"}`}
                  style={{ fontFamily: `"${f}", sans-serif` }}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-panel p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Logos</h2>
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-xs hover:bg-accent">
              <Plus className="h-3 w-3" /> Upload logo
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0]; if (!f) return;
                const r = new FileReader();
                r.onload = () => update({ ...kit, logos: [...kit.logos, { id: Math.random().toString(36).slice(2), name: f.name, url: String(r.result) }] });
                r.readAsDataURL(f);
              }} />
            </label>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {kit.logos.map((l) => (
              <div key={l.id} className="group relative overflow-hidden rounded-md border border-border bg-background">
                <img src={l.url} alt={l.name} className="aspect-square w-full object-contain p-3" />
                <div className="truncate border-t border-border px-2 py-1 text-[11px] text-muted-foreground">{l.name}</div>
                <button
                  onClick={() => update({ ...kit, logos: kit.logos.filter((x) => x.id !== l.id) })}
                  className="absolute right-1 top-1 hidden rounded-full bg-background p-1 text-destructive shadow group-hover:block"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            {kit.logos.length === 0 && (
              <div className="col-span-full rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                No logos uploaded
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
