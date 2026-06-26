import { useEditor } from "@/lib/editor-store";
import { CANVAS_PRESETS } from "@/lib/canvas-presets";
import { Undo2, Redo2, ZoomIn, ZoomOut, Maximize2, Download, Save } from "lucide-react";
import { useState } from "react";
import { toPng, toJpeg, toBlob } from "html-to-image";
import { saveTemplate, listTemplates } from "@/lib/storage";

export function EditorToolbar({ stageRef }: { stageRef: React.RefObject<HTMLDivElement | null> }) {
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const zoom = useEditor((s) => s.zoom);
  const setZoom = useEditor((s) => s.setZoom);
  const setSize = useEditor((s) => s.setSize);
  const template = useEditor((s) => s.template);
  const setTemplate = useEditor((s) => s.setTemplate);
  const [exportOpen, setExportOpen] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);

  const doExport = async (format: "png" | "jpg" | "webp") => {
    const node = stageRef.current;
    if (!node) return;
    const opts = { pixelRatio: 1, width: template.width, height: template.height, style: { transform: "none" } };
    let dataUrl: string;
    if (format === "jpg") dataUrl = await toJpeg(node, { ...opts, quality: 0.95, backgroundColor: "#fff" });
    else if (format === "webp") {
      const blob = await toBlob(node, opts);
      if (!blob) return;
      const canvas = document.createElement("canvas");
      const img = await loadImage(URL.createObjectURL(blob));
      canvas.width = template.width;
      canvas.height = template.height;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      dataUrl = canvas.toDataURL("image/webp", 0.95);
    } else {
      dataUrl = await toPng(node, opts);
    }
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${template.name || "image"}.${format}`;
    a.click();
    setExportOpen(false);
  };

  const onSave = async () => {
    const node = stageRef.current;
    let thumbnail: string | undefined;
    try {
      if (node) thumbnail = await toPng(node, { pixelRatio: 0.3, width: template.width, height: template.height, style: { transform: "none" } });
    } catch {}
    saveTemplate({ ...template, thumbnail });
    // bump
    setTemplate({ ...template, thumbnail });
    alert("Template saved");
  };

  const grouped = CANVAS_PRESETS.reduce<Record<string, typeof CANVAS_PRESETS>>((acc, p) => {
    (acc[p.category] = acc[p.category] || []).push(p);
    return acc;
  }, {});

  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-panel px-3">
      <div className="flex items-center gap-1">
        <button onClick={undo} className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground" title="Undo (⌘Z)">
          <Undo2 className="h-4 w-4" />
        </button>
        <button onClick={redo} className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground" title="Redo (⇧⌘Z)">
          <Redo2 className="h-4 w-4" />
        </button>
        <div className="mx-2 h-5 w-px bg-border" />
        <div className="relative">
          <button
            onClick={() => setPresetOpen((v) => !v)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-accent"
          >
            {template.width} × {template.height}
          </button>
          {presetOpen && (
            <div className="absolute left-0 top-full z-40 mt-1 max-h-96 w-72 overflow-auto rounded-md border border-border bg-popover p-2 shadow-lg">
              {Object.entries(grouped).map(([cat, list]) => (
                <div key={cat} className="mb-2">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{cat}</div>
                  {list.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setSize(p.width, p.height); setPresetOpen(false); }}
                      className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs hover:bg-accent"
                    >
                      <span>{p.name}</span>
                      <span className="text-muted-foreground">{p.width}×{p.height}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button onClick={() => setZoom(zoom - 0.1)} className="rounded-md p-2 text-muted-foreground hover:bg-accent"><ZoomOut className="h-4 w-4" /></button>
        <span className="w-12 text-center text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(zoom + 0.1)} className="rounded-md p-2 text-muted-foreground hover:bg-accent"><ZoomIn className="h-4 w-4" /></button>
        <button onClick={() => setZoom(0.5)} className="rounded-md p-2 text-muted-foreground hover:bg-accent" title="Fit"><Maximize2 className="h-4 w-4" /></button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onSave}
          className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
        >
          <Save className="h-3.5 w-3.5" /> Save
        </button>
        <div className="relative">
          <button
            onClick={() => setExportOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          {exportOpen && (
            <div className="absolute right-0 top-full z-40 mt-1 w-40 rounded-md border border-border bg-popover p-1 shadow-lg">
              {(["png", "jpg", "webp"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => doExport(f)}
                  className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
                >
                  Export as {f.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}
