import { useEditor } from "@/lib/editor-store";
import type { BackgroundLayer, BlendMode, Fill, Gradient, GradientLayer, GradientType, ImageLayer, Layer, TextLayer, TextStyle } from "@/lib/editor-types";
import { FONT_FAMILIES } from "@/lib/canvas-presets";
import { DEFAULT_LINEAR_GRADIENT, fillToSwatch, isGradient } from "@/lib/fill";
import { Plus, Trash2, FlipHorizontal2, RotateCcw } from "lucide-react";

export function PropertiesPanel() {
  const layers = useEditor((s) => s.template.layers);
  const selectedId = useEditor((s) => s.selectedId);
  const layer = layers.find((l) => l.id === selectedId);

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-panel">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {layer ? `${layer.type} properties` : "Properties"}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {layer ? layer.name : "Select a layer to edit its properties"}
        </p>
      </div>
      <div className="flex-1 space-y-5 overflow-auto p-4">
        {!layer && <EmptyState />}
        {layer && <PositionBlock layer={layer} />}
        {layer?.type === "background" && <BackgroundProps layer={layer} />}
        {layer?.type === "image" && <ImageProps layer={layer} />}
        {layer?.type === "text" && <TextProps layer={layer} />}
        {layer?.type === "gradient" && <GradientProps layer={layer} />}
      </div>
    </aside>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
      Click any layer on the canvas to edit its properties.
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

function NumberInput({ value, onChange, suffix }: { value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div className="relative">
      <input
        type="number"
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-md border border-input bg-background px-2 py-1.5 pr-6 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      {suffix && (
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  );
}

function TextInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
    />
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isTransparent = value === "transparent";
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md border border-input">
        <input
          type="color"
          value={isTransparent ? "#ffffff" : value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
        <div className="h-full w-full" style={{ background: isTransparent ? "repeating-conic-gradient(#e5e7eb 0% 25%, #fff 0% 50%) 50% / 12px 12px" : value }} />
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 font-mono text-xs outline-none focus:ring-2 focus:ring-ring"
      />
      <button
        title="Transparent"
        onClick={() => onChange(isTransparent ? "#ffffff" : "transparent")}
        className="rounded-md border border-input px-2 py-1.5 text-[10px] text-muted-foreground hover:bg-accent"
      >
        ∅
      </button>
    </div>
  );
}

function Select<T extends string | number>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { label: string; value: T }[] }) {
  return (
    <select
      value={value as any}
      onChange={(e) => {
        const v = e.target.value;
        const opt = options.find((o) => String(o.value) === v);
        if (opt) onChange(opt.value);
      }}
      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
    >
      {options.map((o) => (
        <option key={String(o.value)} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function PositionBlock({ layer }: { layer: Layer }) {
  const update = useEditor((s) => s.updateLayer);
  if (layer.type === "background") return null;
  return (
    <div className="space-y-3">
      <Row>
        <Field label="X"><NumberInput value={layer.x} onChange={(v) => update(layer.id, { x: v })} /></Field>
        <Field label="Y"><NumberInput value={layer.y} onChange={(v) => update(layer.id, { y: v })} /></Field>
      </Row>
      <Row>
        <Field label="Width"><NumberInput value={layer.width} onChange={(v) => update(layer.id, { width: v })} /></Field>
        <Field label="Height"><NumberInput value={layer.height} onChange={(v) => update(layer.id, { height: v })} /></Field>
      </Row>
      <Row>
        <Field label="Rotation"><NumberInput value={layer.rotation} onChange={(v) => update(layer.id, { rotation: v })} suffix="°" /></Field>
        <Field label="Opacity">
          <input type="range" min={0} max={1} step={0.01} value={layer.opacity}
            onChange={(e) => update(layer.id, { opacity: Number(e.target.value) })} className="w-full" />
        </Field>
      </Row>
    </div>
  );
}

function BackgroundProps({ layer }: { layer: BackgroundLayer }) {
  const update = useEditor((s) => s.updateBackground);
  const setSize = useEditor((s) => s.setSize);
  return (
    <div className="space-y-4">
      <Field label="Canvas size">
        <Row>
          <NumberInput value={layer.width} onChange={(v) => setSize(v, layer.height)} />
          <NumberInput value={layer.height} onChange={(v) => setSize(layer.width, v)} />
        </Row>
      </Field>
      <Field label="Fill">
        <FillInput value={layer.color} onChange={(v) => update(layer.id, { color: v })} />
      </Field>
      <Field label="Background image URL">
        <TextInput value={layer.imageUrl || ""} onChange={(v) => update(layer.id, { imageUrl: v || undefined })} />
      </Field>
      <Field label="Upload background">
        <FileUpload onUrl={(url) => update(layer.id, { imageUrl: url })} />
      </Field>
      <Field label="Image fit">
        <Select value={layer.imageFit} onChange={(v) => update(layer.id, { imageFit: v })}
          options={[
            { label: "Cover", value: "cover" },
            { label: "Contain", value: "contain" },
            { label: "Stretch", value: "stretch" },
            { label: "Fill", value: "fill" },
          ]} />
      </Field>
    </div>
  );
}

function ImageProps({ layer }: { layer: ImageLayer }) {
  const update = useEditor((s) => s.updateImage);
  return (
    <div className="space-y-4">
      <Field label="Image URL">
        <TextInput value={layer.imageUrl || ""} onChange={(v) => update(layer.id, { imageUrl: v || undefined })} />
      </Field>
      <Field label="Upload">
        <FileUpload onUrl={(url) => update(layer.id, { imageUrl: url })} />
      </Field>
      <Row>
        <Field label="Fit">
          <Select value={layer.fit} onChange={(v) => update(layer.id, { fit: v })}
            options={[
              { label: "Cover", value: "cover" },
              { label: "Contain", value: "contain" },
              { label: "Fill", value: "fill" },
              { label: "Stretch", value: "stretch" },
            ]} />
        </Field>
        <Field label="Mask">
          <Select value={layer.mask} onChange={(v) => update(layer.id, { mask: v })}
            options={[
              { label: "None", value: "none" },
              { label: "Rounded", value: "rounded" },
              { label: "Circle", value: "circle" },
            ]} />
        </Field>
      </Row>
      <Row>
        <Field label="Radius"><NumberInput value={layer.radius} onChange={(v) => update(layer.id, { radius: v })} suffix="px" /></Field>
        <Field label="Border W"><NumberInput value={layer.borderWidth} onChange={(v) => update(layer.id, { borderWidth: v })} suffix="px" /></Field>
      </Row>
      <Field label="Border color">
        <ColorInput value={layer.borderColor} onChange={(v) => update(layer.id, { borderColor: v })} />
      </Field>
    </div>
  );
}

function TextProps({ layer }: { layer: TextLayer }) {
  const update = useEditor((s) => s.updateText);
  return (
    <div className="space-y-4">
      <Field label={`Content — wrap *highlighted* parts with asterisks`}>
        <textarea
          value={layer.text}
          onChange={(e) => update(layer.id, { text: e.target.value })}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </Field>
      <Field label="Font family">
        <Select value={layer.fontFamily} onChange={(v) => update(layer.id, { fontFamily: v })}
          options={FONT_FAMILIES.map((f) => ({ label: f, value: f }))} />
      </Field>
      <Row>
        <Field label="Size"><NumberInput value={layer.fontSize} onChange={(v) => update(layer.id, { fontSize: v })} /></Field>
        <Field label="Line height"><NumberInput value={layer.lineHeight * 100} onChange={(v) => update(layer.id, { lineHeight: v / 100 })} suffix="%" /></Field>
      </Row>
      <Row>
        <Field label="Letter spacing"><NumberInput value={layer.letterSpacing} onChange={(v) => update(layer.id, { letterSpacing: v })} suffix="px" /></Field>
        <Field label="Align">
          <Select value={layer.align} onChange={(v) => update(layer.id, { align: v })}
            options={[
              { label: "Left", value: "left" },
              { label: "Center", value: "center" },
              { label: "Right", value: "right" },
            ]} />
        </Field>
      </Row>

      <StyleEditor title="Primary style" style={layer.primary}
        onChange={(s) => update(layer.id, { primary: s })} />
      <StyleEditor title="Secondary style (for *highlighted*)" style={layer.secondary}
        onChange={(s) => update(layer.id, { secondary: s })} />
    </div>
  );
}

function StyleEditor({ title, style, onChange }: { title: string; style: TextStyle; onChange: (s: TextStyle) => void }) {
  const u = (patch: Partial<TextStyle>) => onChange({ ...style, ...patch });
  return (
    <div className="space-y-3 rounded-lg border border-border bg-secondary/40 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground">{title}</div>
      <Row>
        <Field label="Color"><FillInput value={style.color} onChange={(v) => u({ color: v })} /></Field>
        <Field label="Weight">
          <Select value={style.fontWeight} onChange={(v) => u({ fontWeight: v as any })}
            options={[300,400,500,600,700,800,900].map((w) => ({ label: String(w), value: w as any }))} />
        </Field>
      </Row>
      <Row>
        <Field label="Style">
          <Select value={style.fontStyle} onChange={(v) => u({ fontStyle: v })}
            options={[{label:"Normal",value:"normal"},{label:"Italic",value:"italic"}]} />
        </Field>
        <Field label="Transform">
          <Select value={style.textTransform} onChange={(v) => u({ textTransform: v })}
            options={[
              {label:"None",value:"none"},{label:"UPPER",value:"uppercase"},
              {label:"lower",value:"lowercase"},{label:"Title",value:"capitalize"},
            ]} />
        </Field>
      </Row>
      <Field label="Decoration">
        <Select value={style.textDecoration} onChange={(v) => u({ textDecoration: v })}
          options={[
            {label:"None",value:"none"},
            {label:"Underline",value:"underline"},
            {label:"Strike",value:"line-through"},
          ]} />
      </Field>
      <div className="-mx-1 my-2 border-t border-border" />
      <Field label="Text background"><FillInput value={style.bgColor} onChange={(v) => u({ bgColor: v })} /></Field>
      <Row>
        <Field label="H padding"><NumberInput value={style.bgPaddingX} onChange={(v) => u({ bgPaddingX: v })} suffix="px" /></Field>
        <Field label="V padding"><NumberInput value={style.bgPaddingY} onChange={(v) => u({ bgPaddingY: v })} suffix="px" /></Field>
      </Row>
      <Row>
        <Field label="Radius"><NumberInput value={style.bgRadius} onChange={(v) => u({ bgRadius: v })} suffix="px" /></Field>
        <Field label="Shadow">
          <TextInput value={style.shadow === "none" ? "" : style.shadow} onChange={(v) => u({ shadow: v || "none" })} />
        </Field>
      </Row>
    </div>
  );
}

function FileUpload({ onUrl }: { onUrl: (url: string) => void }) {
  return (
    <input
      type="file"
      accept="image/*"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => onUrl(String(reader.result));
        reader.readAsDataURL(f);
      }}
      className="block w-full text-xs file:mr-2 file:cursor-pointer file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-accent"
    />
  );
}

// ============== FillInput (solid / linear / radial / transparent) ==============

type FillKind = "solid" | "linear" | "radial" | "transparent";

function fillKind(f: Fill): FillKind {
  if (f === "transparent") return "transparent";
  if (isGradient(f)) return f.type === "linear" || f.type === "radial" ? f.type : "linear";
  return "solid";
}

function FillInput({ value, onChange }: { value: Fill; onChange: (v: Fill) => void }) {
  const kind = fillKind(value);

  const setKind = (k: FillKind) => {
    if (k === "transparent") return onChange("transparent");
    if (k === "solid") return onChange(isGradient(value) ? (value.stops[0]?.color ?? "#000000") : value === "transparent" ? "#000000" : value);
    // gradient
    const base: Gradient = isGradient(value)
      ? { ...value, type: k }
      : { ...DEFAULT_LINEAR_GRADIENT, type: k };
    onChange(base);
  };

  return (
    <div className="space-y-2 rounded-md border border-input bg-background p-2">
      <div className="flex items-center gap-2">
        <div className="h-7 w-10 shrink-0 rounded border border-input" style={fillToSwatch(value)} />
        <div className="flex flex-1 overflow-hidden rounded border border-input text-[10px]">
          {(["solid", "linear", "radial", "transparent"] as FillKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`flex-1 px-1.5 py-1 capitalize ${kind === k ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"}`}
            >
              {k === "transparent" ? "none" : k}
            </button>
          ))}
        </div>
      </div>

      {kind === "solid" && typeof value === "string" && value !== "transparent" && (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 w-10 cursor-pointer rounded border border-input bg-transparent"
          />
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 font-mono text-xs outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      {(kind === "linear" || kind === "radial") && isGradient(value) && (
        <GradientEditor value={value} onChange={onChange} />
      )}
    </div>
  );
}

function GradientEditor({ value, onChange }: { value: Gradient; onChange: (v: Gradient) => void }) {
  const update = (patch: Partial<Gradient>) => onChange({ ...value, ...patch });
  const updateStop = (i: number, patch: Partial<{ color: string; position: number; opacity: number }>) => {
    const stops = value.stops.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
    update({ stops });
  };
  const addStop = () => {
    const last = value.stops[value.stops.length - 1];
    update({ stops: [...value.stops, { color: last?.color ?? "#ffffff", position: 100, opacity: 1 }] });
  };
  const removeStop = (i: number) => {
    if (value.stops.length <= 2) return;
    update({ stops: value.stops.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="space-y-2">
      {value.type === "linear" && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Angle</span>
          <input
            type="range"
            min={0}
            max={360}
            value={value.angle}
            onChange={(e) => update({ angle: Number(e.target.value) })}
            className="flex-1"
          />
          <input
            type="number"
            value={value.angle}
            onChange={(e) => update({ angle: Number(e.target.value) })}
            className="w-14 rounded-md border border-input bg-background px-1.5 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}
      <div className="space-y-1.5">
        {value.stops.map((stop, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              type="color"
              value={stop.color}
              onChange={(e) => updateStop(i, { color: e.target.value })}
              className="h-7 w-8 cursor-pointer rounded border border-input bg-transparent"
            />
            <input
              value={stop.color}
              onChange={(e) => updateStop(i, { color: e.target.value })}
              className="flex-1 rounded-md border border-input bg-background px-1.5 py-1 font-mono text-[10px] outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="number"
              min={0}
              max={100}
              value={Math.round(stop.position)}
              onChange={(e) => updateStop(i, { position: Number(e.target.value) })}
              className="w-12 rounded-md border border-input bg-background px-1.5 py-1 text-[10px] outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => removeStop(i)}
              disabled={value.stops.length <= 2}
              className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-30"
              title="Remove stop"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addStop}
          className="flex w-full items-center justify-center gap-1 rounded border border-dashed border-input py-1 text-[10px] text-muted-foreground hover:bg-accent"
        >
          <Plus className="h-3 w-3" /> Add stop
        </button>
      </div>
    </div>
  );
}
