import { createFileRoute, useSearch } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Canvas } from "@/components/editor/Canvas";
import { LayersPanel } from "@/components/editor/LayersPanel";
import { PropertiesPanel } from "@/components/editor/PropertiesPanel";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { useEffect, useRef } from "react";
import { useEditor, makeDefaultTemplate } from "@/lib/editor-store";
import { getTemplate } from "@/lib/storage";

export const Route = createFileRoute("/editor")({
  head: () => ({
    meta: [
      { title: "Editor — Frameforge" },
      { name: "description", content: "Visual template editor: layers, text, images, brand colors, and one-click export." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({ id: typeof s.id === "string" ? s.id : undefined }),
  component: EditorPage,
});

function EditorPage() {
  const { id } = useSearch({ from: "/editor" });
  const setTemplate = useEditor((s) => s.setTemplate);
  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (id) {
      const t = getTemplate(id);
      if (t) setTemplate(t);
      else setTemplate(makeDefaultTemplate());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <AppShell fullBleed>
      <div className="flex h-full flex-col">
        <EditorToolbar stageRef={stageRef} />
        <div className="flex min-h-0 flex-1">
          <LayersPanel />
          <div className="min-w-0 flex-1 overflow-hidden">
            <Canvas exportRef={stageRef} />
          </div>
          <PropertiesPanel />
        </div>
      </div>
    </AppShell>
  );
}
