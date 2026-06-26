import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { deleteTemplate, listTemplates, saveTemplate } from "@/lib/storage";
import type { Template } from "@/lib/editor-types";
import { makeDefaultTemplate } from "@/lib/editor-store";
import { Plus, Trash2 } from "lucide-react";
import { api, assetUrl } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-store";
import { AuthBadge } from "@/components/AuthGate";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "Templates — Frameforge" },
      { name: "description", content: "Your saved image templates." },
    ],
  }),
  component: TemplatesPage,
});

function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const router = useRouter();
  const { user, token } = useAuth();
  const remote = Boolean(token && user);

  async function refresh() {
    if (remote) {
      try {
        const { templates } = await api.templates.list();
        setTemplates(templates);
        setRemoteError(null);
      } catch (e: any) {
        setRemoteError(e.message ?? "Failed to load");
      }
    } else {
      setTemplates(listTemplates());
    }
  }

  useEffect(() => { void refresh(); /* eslint-disable-line */ }, [remote]);

  const newTemplate = async () => {
    const t = makeDefaultTemplate();
    if (remote) {
      try {
        const { template } = await api.templates.create({
          name: t.name, width: t.width, height: t.height,
          layers: t.layers, thumbnail: t.thumbnail,
        } as any);
        router.navigate({ to: "/editor", search: { id: template.id } });
        return;
      } catch (e: any) {
        setRemoteError(e.message ?? "Failed to create");
        return;
      }
    }
    saveTemplate(t);
    router.navigate({ to: "/editor", search: { id: t.id } });
  };


  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Templates</h1>
            <p className="mt-1 text-sm text-muted-foreground">Saved in your browser. {templates.length} total.</p>
          </div>
          <button onClick={newTemplate} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            <Plus className="h-4 w-4" /> New template
          </button>
        </div>

        {templates.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-border bg-panel p-12 text-center">
            <p className="text-muted-foreground">No templates saved yet.</p>
            <button onClick={newTemplate} className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              Create your first template
            </button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <div key={t.id} className="group overflow-hidden rounded-xl border border-border bg-panel">
                <Link to="/editor" search={{ id: t.id }} className="block">
                  <div className="checker-bg aspect-video w-full overflow-hidden">
                    {t.thumbnail ? (
                      <img src={t.thumbnail} alt={t.name} className="h-full w-full object-contain" />
                    ) : (
                      <div className="grid h-full place-items-center text-xs text-muted-foreground">No preview</div>
                    )}
                  </div>
                </Link>
                <div className="flex items-center justify-between p-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{t.name}</div>
                    <div className="text-[11px] text-muted-foreground">{t.width}×{t.height} · {new Date(t.updatedAt).toLocaleDateString()}</div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm("Delete this template?")) {
                        deleteTemplate(t.id);
                        setTemplates(listTemplates());
                      }
                    }}
                    className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
