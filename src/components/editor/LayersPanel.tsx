import { useEditor } from "@/lib/editor-store";
import type { Layer } from "@/lib/editor-types";
import { Eye, EyeOff, Lock, Unlock, Copy, Trash2, ChevronUp, ChevronDown, Plus, Type, Image as ImageIcon, Palette, Square } from "lucide-react";
import { useState } from "react";

export function LayersPanel() {
  const layers = useEditor((s) => s.template.layers);
  const selectedId = useEditor((s) => s.selectedId);
  const select = useEditor((s) => s.select);
  const toggleVisible = useEditor((s) => s.toggleVisible);
  const toggleLock = useEditor((s) => s.toggleLock);
  const remove = useEditor((s) => s.removeLayer);
  const duplicate = useEditor((s) => s.duplicateLayer);
  const reorder = useEditor((s) => s.reorder);
  const addLayer = useEditor((s) => s.addLayer);
  const setName = useEditor((s) => s.setName);
  const templateName = useEditor((s) => s.template.name);

  // render top->bottom (visually). Layers are drawn in array order; last = top.
  const ordered = [...layers].reverse();

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-panel">
      <div className="border-b border-border p-3">
        <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Template name
        </label>
        <input
          value={templateName}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex items-center justify-between border-b border-border p-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Layers
        </span>
        <NewLayerButtons addLayer={addLayer} />
      </div>

      <div className="flex-1 overflow-auto py-1">
        {ordered.map((layer) => (
          <LayerRow
            key={layer.id}
            layer={layer}
            selected={selectedId === layer.id}
            onSelect={() => select(layer.id)}
            onToggleVisible={() => toggleVisible(layer.id)}
            onToggleLock={() => toggleLock(layer.id)}
            onRemove={() => remove(layer.id)}
            onDuplicate={() => duplicate(layer.id)}
            onMoveUp={() => reorder(layer.id, "up")}
            onMoveDown={() => reorder(layer.id, "down")}
          />
        ))}
      </div>
    </aside>
  );
}

function LayerRow({
  layer,
  selected,
  onSelect,
  onToggleVisible,
  onToggleLock,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}: {
  layer: Layer;
  selected: boolean;
  onSelect: () => void;
  onToggleVisible: () => void;
  onToggleLock: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const icon =
    layer.type === "text" ? <Type className="h-3.5 w-3.5" /> :
    layer.type === "image" ? <ImageIcon className="h-3.5 w-3.5" /> :
    layer.type === "gradient" ? <Palette className="h-3.5 w-3.5" /> :
    <div className="h-3.5 w-3.5 rounded-sm bg-foreground/40" />;

  return (
    <div
      onClick={onSelect}
      className={`group mx-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
        selected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
      }`}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1 truncate">{layer.name}</span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 data-[selected=true]:opacity-100" data-selected={selected}>
        <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} className="rounded p-1 hover:bg-background"><ChevronUp className="h-3 w-3" /></button>
        <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} className="rounded p-1 hover:bg-background"><ChevronDown className="h-3 w-3" /></button>
        <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="rounded p-1 hover:bg-background"><Copy className="h-3 w-3" /></button>
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="rounded p-1 hover:bg-background"><Trash2 className="h-3 w-3" /></button>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onToggleLock(); }} className="rounded p-1 text-muted-foreground hover:bg-background">
        {layer.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3 opacity-40" />}
      </button>
      <button onClick={(e) => { e.stopPropagation(); onToggleVisible(); }} className="rounded p-1 text-muted-foreground hover:bg-background">
        {layer.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 opacity-40" />}
      </button>
    </div>
  );
}

function NewLayerButtons({ addLayer }: { addLayer: (k: "text" | "image" | "gradient") => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => addLayer("text")}
        title="Add text"
        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Type className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => addLayer("image")}
        title="Add image"
        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <ImageIcon className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => addLayer("gradient")}
        title="Add gradient overlay"
        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Palette className="h-3.5 w-3.5" />
      </button>
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          title="New layer"
          className="rounded-md p-1.5 text-primary hover:bg-accent"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        {open && (
          <div className="absolute right-0 top-full z-40 mt-1 w-44 rounded-md border border-border bg-popover p-1 shadow-lg">
            <PickItem icon={<ImageIcon className="h-3.5 w-3.5" />} label="Image layer" onClick={() => { addLayer("image"); setOpen(false); }} />
            <PickItem icon={<Type className="h-3.5 w-3.5" />} label="Text layer" onClick={() => { addLayer("text"); setOpen(false); }} />
            <PickItem icon={<Square className="h-3.5 w-3.5" />} label="Shape layer" disabled />
            <PickItem icon={<Palette className="h-3.5 w-3.5" />} label="Gradient layer" onClick={() => { addLayer("gradient"); setOpen(false); }} />
          </div>
        )}
      </div>
    </div>
  );
}

function PickItem({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {disabled && <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Soon</span>}
    </button>
  );
}
