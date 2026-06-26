import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useRef, useState } from "react";
import { listTemplates } from "@/lib/storage";
import type { Template, TextLayer } from "@/lib/editor-types";
import { renderText } from "@/components/editor/text-render";
import { toPng } from "html-to-image";
import { fillToBackground } from "@/lib/fill";
import { Download, Loader2 } from "lucide-react";

import { AuthGate } from "@/components/AuthGate";

export const Route = createFileRoute("/batch")({
  head: () => ({
    meta: [
      { title: "Batch Render — Frameforge" },
      { name: "description", content: "Bulk-render images from a CSV by mapping columns to template variables." },
    ],
  }),
  component: () => (
    <AuthGate>
      <BatchPage />
    </AuthGate>
  ),
});

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.replace(/\r/g, "").split("\n").filter(Boolean);
  if (!lines.length) return { headers: [], rows: [] };
  const split = (l: string) => {
    const out: string[] = []; let cur = ""; let q = false;
    for (let i = 0; i < l.length; i++) {
      const c = l[i];
      if (c === '"') { q = !q; continue; }
      if (c === "," && !q) { out.push(cur); cur = ""; continue; }
      cur += c;
    }
    out.push(cur); return out;
  };
  const headers = split(lines[0]).map((h) => h.trim());
  const rows = lines.slice(1).map((l) => {
    const cells = split(l);
    const o: Record<string, string> = {};
    headers.forEach((h, i) => (o[h] = (cells[i] || "").trim()));
    return o;
  });
  return { headers, rows };
}

function applyRowToTemplate(t: Template, row: Record<string, string>): Template {
  const layers = t.layers.map((l) => {
    if (l.type !== "text") return l;
    let text = l.text;
    for (const [k, v] of Object.entries(row)) {
      text = text.split(`{{${k}}}`).join(v);
    }
    return { ...l, text } as TextLayer;
  });
  return { ...t, layers };
}

function findVariables(t: Template): string[] {
  const set = new Set<string>();
  t.layers.forEach((l) => {
    if (l.type !== "text") return;
    const m = l.text.match(/{{\s*([^}]+?)\s*}}/g) || [];
    m.forEach((token) => set.add(token.replace(/[{}\s]/g, "")));
  });
  return [...set];
}

function BatchPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState<string>("");
  const [csv, setCsv] = useState<{ headers: string[]; rows: Record<string, string>[] }>({ headers: [], rows: [] });
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const all = listTemplates();
    setTemplates(all);
    if (all.length) setTemplateId(all[0].id);
  }, []);

  const template = templates.find((t) => t.id === templateId);
  const variables = template ? findVariables(template) : [];

  const renderAll = async () => {
    if (!template || !csv.rows.length) return;
    setBusy(true); setProgress(0);
    const node = previewRef.current!;
    for (let i = 0; i < csv.rows.length; i++) {
      const t = applyRowToTemplate(template, csv.rows[i]);
      renderTemplateInto(node, t);
      await new Promise((r) => setTimeout(r, 40));
      const url = await toPng(node, { width: t.width, height: t.height, pixelRatio: 1, style: { transform: "none" } });
      const a = document.createElement("a");
      a.href = url; a.download = `${template.name}-${i + 1}.png`;
      a.click();
      setProgress(i + 1);
    }
    setBusy(false);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-8 px-6 py-12">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">Batch Render</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a template, upload a CSV, and render one image per row. Use <code className="rounded bg-secondary px-1 py-0.5 text-xs">{"{{column_name}}"}</code> inside text layers to substitute values.
          </p>
        </header>

        <section className="rounded-xl border border-border bg-panel p-6">
          <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Template</label>
          {templates.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Save a template in the editor first.</p>
          ) : (
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.width}×{t.height})</option>
              ))}
            </select>
          )}

          {template && (
            <div className="mt-3 text-xs text-muted-foreground">
              {variables.length > 0 ? (
                <>Variables found: {variables.map((v) => <code key={v} className="ml-1 rounded bg-secondary px-1.5 py-0.5">{`{{${v}}}`}</code>)}</>
              ) : (
                <>No <code className="rounded bg-secondary px-1 py-0.5">{"{{variables}}"}</code> in this template. Add some to make rows interactive.</>
              )}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-panel p-6">
          <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">CSV file</label>
          <input
            type="file" accept=".csv,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0]; if (!f) return;
              const r = new FileReader();
              r.onload = () => setCsv(parseCSV(String(r.result)));
              r.readAsText(f);
            }}
            className="mt-2 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-accent"
          />

          {csv.rows.length > 0 && (
            <div className="mt-4 overflow-auto rounded-md border border-border">
              <table className="w-full text-xs">
                <thead className="bg-secondary text-left">
                  <tr>{csv.headers.map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {csv.rows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      {csv.headers.map((h) => <td key={h} className="px-3 py-1.5">{r[h]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              {csv.rows.length > 5 && <div className="border-t border-border p-2 text-center text-xs text-muted-foreground">+ {csv.rows.length - 5} more rows</div>}
            </div>
          )}
        </section>

        <div className="flex items-center gap-3">
          <button
            disabled={!template || !csv.rows.length || busy}
            onClick={renderAll}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {busy ? `Rendering ${progress}/${csv.rows.length}` : `Render ${csv.rows.length || ""} images`}
          </button>
          <span className="text-xs text-muted-foreground">Each row downloads as a separate PNG.</span>
        </div>

        {/* offscreen preview node used for rendering */}
        <div style={{ position: "fixed", left: -99999, top: 0 }}>
          <div ref={previewRef} />
        </div>
      </div>
    </AppShell>
  );
}

function renderTemplateInto(host: HTMLDivElement, t: Template) {
  host.style.width = `${t.width}px`;
  host.style.height = `${t.height}px`;
  host.style.position = "relative";
  host.style.background = "#fff";
  host.style.overflow = "hidden";
  host.innerHTML = "";
  t.layers.forEach((layer) => {
    if (!layer.visible) return;
    const el = document.createElement("div");
    el.style.position = "absolute";
    el.style.left = `${layer.x}px`;
    el.style.top = `${layer.y}px`;
    el.style.width = `${layer.width}px`;
    el.style.height = `${layer.height}px`;
    el.style.opacity = String(layer.opacity);
    el.style.transform = `rotate(${layer.rotation}deg)`;
    if (layer.type === "background") {
      el.style.background = fillToBackground(layer.color);
      if (layer.imageUrl) {
        el.style.backgroundImage = `url(${layer.imageUrl})`;
        el.style.backgroundSize = layer.imageFit === "cover" ? "cover" : layer.imageFit === "contain" ? "contain" : layer.imageFit === "stretch" ? "100% 100%" : "auto";
        el.style.backgroundPosition = "center";
      }
    } else if (layer.type === "image") {
      el.style.overflow = "hidden";
      el.style.borderRadius = layer.mask === "circle" ? "9999px" : `${layer.radius}px`;
      if (layer.borderWidth) el.style.border = `${layer.borderWidth}px solid ${layer.borderColor}`;
      if (layer.imageUrl) {
        const img = document.createElement("img");
        img.src = layer.imageUrl;
        img.style.width = "100%"; img.style.height = "100%";
        img.style.objectFit = layer.fit === "fill" || layer.fit === "stretch" ? "fill" : (layer.fit as string);
        el.appendChild(img);
      }
    } else if (layer.type === "text") {
      // text -- simplified renderer mirroring text-render
      const wrapper = document.createElement("div");
      wrapper.style.cssText = `width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;text-align:${layer.align};font-family:"${layer.fontFamily}",sans-serif;font-size:${layer.fontSize}px;letter-spacing:${layer.letterSpacing}px;line-height:${layer.lineHeight};overflow:hidden;`;
      wrapper.style.alignItems = layer.align === "left" ? "flex-start" : layer.align === "right" ? "flex-end" : "center";
      layer.text.split("\n").forEach((line) => {
        const lineEl = document.createElement("div");
        const segs: { content: string; highlight: boolean }[] = [];
        const re = /\*([^*]+)\*/g; let last = 0; let m;
        while ((m = re.exec(line))) {
          if (m.index > last) segs.push({ content: line.slice(last, m.index), highlight: false });
          segs.push({ content: m[1], highlight: true });
          last = m.index + m[0].length;
        }
        if (last < line.length) segs.push({ content: line.slice(last), highlight: false });
        if (!segs.length) segs.push({ content: " ", highlight: false });
        segs.forEach((seg) => {
          const s = seg.highlight ? layer.secondary : layer.primary;
          const span = document.createElement("span");
          span.textContent = seg.content;
          span.style.cssText = `color:${s.color};font-weight:${s.fontWeight};font-style:${s.fontStyle};text-decoration:${s.textDecoration};text-transform:${s.textTransform};background-color:${s.bgColor};padding:${s.bgPaddingY}px ${s.bgPaddingX}px;border-radius:${s.bgRadius}px;text-shadow:${s.shadow};box-decoration-break:clone;-webkit-box-decoration-break:clone;`;
          lineEl.appendChild(span);
        });
        wrapper.appendChild(lineEl);
      });
      el.appendChild(wrapper);
    }
    host.appendChild(el);
  });
}
