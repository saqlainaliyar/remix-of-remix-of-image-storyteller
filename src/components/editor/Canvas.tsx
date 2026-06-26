import { useEditor } from "@/lib/editor-store";
import type { Layer, BackgroundLayer, ImageLayer, TextLayer, GradientLayer } from "@/lib/editor-types";
import { fillToBackground, gradientToCSS } from "@/lib/fill";
import { renderText } from "./text-render";
import { useCallback, useEffect, useRef } from "react";

const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;
type Handle = (typeof HANDLES)[number];

export function Canvas({ exportRef }: { exportRef?: React.RefObject<HTMLDivElement | null> }) {
  const template = useEditor((s) => s.template);
  const selectedId = useEditor((s) => s.selectedId);
  const zoom = useEditor((s) => s.zoom);
  const showGuides = useEditor((s) => s.showGuides);
  const select = useEditor((s) => s.select);
  const updateLayer = useEditor((s) => s.updateLayer);
  const pushHistory = useEditor((s) => s.pushHistory);

  const stageRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    id: string;
    mode: "move" | "resize";
    handle?: Handle;
    startX: number;
    startY: number;
    orig: Layer;
  } | null>(null);

  const onMouseDownLayer = (e: React.MouseEvent, layer: Layer) => {
    if (layer.locked || layer.type === "background") return;
    e.stopPropagation();
    select(layer.id);
    pushHistory();
    dragState.current = {
      id: layer.id,
      mode: "move",
      startX: e.clientX,
      startY: e.clientY,
      orig: { ...layer },
    };
  };

  const onMouseDownHandle = (e: React.MouseEvent, layer: Layer, handle: Handle) => {
    e.stopPropagation();
    pushHistory();
    dragState.current = {
      id: layer.id,
      mode: "resize",
      handle,
      startX: e.clientX,
      startY: e.clientY,
      orig: { ...layer },
    };
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragState.current;
      if (!d) return;
      const dx = (e.clientX - d.startX) / zoom;
      const dy = (e.clientY - d.startY) / zoom;
      const o = d.orig;
      if (d.mode === "move") {
        updateLayer(d.id, { x: o.x + dx, y: o.y + dy });
      } else if (d.handle) {
        let { x, y, width, height } = o;
        if (d.handle.includes("e")) width = Math.max(20, o.width + dx);
        if (d.handle.includes("s")) height = Math.max(20, o.height + dy);
        if (d.handle.includes("w")) {
          width = Math.max(20, o.width - dx);
          x = o.x + (o.width - width);
        }
        if (d.handle.includes("n")) {
          height = Math.max(20, o.height - dy);
          y = o.y + (o.height - height);
        }
        updateLayer(d.id, { x, y, width, height });
      }
    };
    const onUp = () => {
      dragState.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [zoom, updateLayer]);

  const onDelete = useCallback(
    (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        useEditor.getState().removeLayer(selectedId);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) useEditor.getState().redo();
        else useEditor.getState().undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "d" && selectedId) {
        e.preventDefault();
        useEditor.getState().duplicateLayer(selectedId);
      }
    },
    [selectedId]
  );

  useEffect(() => {
    window.addEventListener("keydown", onDelete);
    return () => window.removeEventListener("keydown", onDelete);
  }, [onDelete]);

  return (
    <div
      className="flex h-full w-full items-center justify-center overflow-auto bg-muted/40 p-6"
      onMouseDown={() => select(null)}
    >
      <div
        style={{
          width: template.width * zoom,
          height: template.height * zoom,
        }}
        className="checker-bg relative shadow-2xl"
      >
        <div
          ref={(el) => {
            stageRef.current = el;
            if (exportRef) exportRef.current = el;
          }}
          style={{
            width: template.width,
            height: template.height,
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            position: "absolute",
            top: 0,
            left: 0,
            overflow: "hidden",
          }}
        >
          {template.layers.map((layer) => (
            <LayerView
              key={layer.id}
              layer={layer}
              selected={selectedId === layer.id}
              showGuides={showGuides}
              onMouseDown={(e) => onMouseDownLayer(e, layer)}
              onHandleDown={(e, h) => onMouseDownHandle(e, layer, h)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function LayerView({
  layer,
  selected,
  showGuides,
  onMouseDown,
  onHandleDown,
}: {
  layer: Layer;
  selected: boolean;
  showGuides: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onHandleDown: (e: React.MouseEvent, h: Handle) => void;
}) {
  if (!layer.visible) return null;

  const common: React.CSSProperties = {
    position: "absolute",
    left: layer.x,
    top: layer.y,
    width: layer.width,
    height: layer.height,
    transform: `rotate(${layer.rotation}deg)`,
    opacity: layer.opacity,
  };

  return (
    <div
      style={common}
      onMouseDown={onMouseDown}
      data-layer-id={layer.id}
    >
      {layer.type === "background" && <RenderBackground layer={layer as BackgroundLayer} />}
      {layer.type === "image" && <RenderImage layer={layer as ImageLayer} />}
      {layer.type === "text" && renderText(layer as TextLayer)}

      {selected && showGuides && layer.type !== "background" && (
        <>
          <div
            style={{
              position: "absolute",
              inset: 0,
              border: `2px solid #4f46e5`,
              pointerEvents: "none",
            }}
          />
          {HANDLES.map((h) => (
            <div
              key={h}
              onMouseDown={(e) => onHandleDown(e, h)}
              style={{
                position: "absolute",
                width: 14,
                height: 14,
                background: "#fff",
                border: "2px solid #4f46e5",
                borderRadius: 2,
                cursor: handleCursor(h),
                ...handlePos(h),
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}

function handlePos(h: Handle): React.CSSProperties {
  const off = -7;
  const map: Record<Handle, React.CSSProperties> = {
    nw: { left: off, top: off },
    n: { left: "50%", top: off, transform: "translateX(-50%)" },
    ne: { right: off, top: off },
    e: { right: off, top: "50%", transform: "translateY(-50%)" },
    se: { right: off, bottom: off },
    s: { left: "50%", bottom: off, transform: "translateX(-50%)" },
    sw: { left: off, bottom: off },
    w: { left: off, top: "50%", transform: "translateY(-50%)" },
  };
  return map[h];
}

function handleCursor(h: Handle): string {
  return (
    {
      nw: "nwse-resize",
      n: "ns-resize",
      ne: "nesw-resize",
      e: "ew-resize",
      se: "nwse-resize",
      s: "ns-resize",
      sw: "nesw-resize",
      w: "ew-resize",
    } as Record<Handle, string>
  )[h];
}

function RenderBackground({ layer }: { layer: BackgroundLayer }) {
  const bg = fillToBackground(layer.color);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: bg,
        backgroundImage: layer.imageUrl
          ? `url(${layer.imageUrl})`
          : typeof layer.color === "object"
            ? bg
            : undefined,
        backgroundSize:
          layer.imageFit === "cover"
            ? "cover"
            : layer.imageFit === "contain"
              ? "contain"
              : layer.imageFit === "stretch"
                ? "100% 100%"
                : "auto",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}

function RenderImage({ layer }: { layer: ImageLayer }) {
  const radius =
    layer.mask === "circle" ? "9999px" : layer.mask === "rounded" ? `${layer.radius}px` : `${layer.radius}px`;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: radius,
        overflow: "hidden",
        border: layer.borderWidth ? `${layer.borderWidth}px solid ${layer.borderColor}` : undefined,
        background: layer.imageUrl ? undefined : "rgba(0,0,0,0.08)",
        display: "grid",
        placeItems: "center",
        color: "rgba(0,0,0,0.4)",
        fontSize: 14,
      }}
    >
      {layer.imageUrl ? (
        <img
          src={layer.imageUrl}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit:
              layer.fit === "fill" || layer.fit === "stretch"
                ? "fill"
                : (layer.fit as "cover" | "contain"),
          }}
          draggable={false}
        />
      ) : (
        <span>Image placeholder</span>
      )}
    </div>
  );
}
