import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { useEffect, useState } from "react";
import { api, type ApiKeyInfo } from "@/lib/api-client";
import { Copy, Plus, Trash2, Check } from "lucide-react";

export const Route = createFileRoute("/api-keys")({
  head: () => ({
    meta: [
      { title: "API Keys — Frameforge" },
      { name: "description", content: "Generate API keys to access the Frameforge render API. Limited to 30 requests per month per key." },
    ],
  }),
  component: () => (
    <AuthGate>
      <ApiKeysPage />
    </AuthGate>
  ),
});

function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<{ key: string; id: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function refresh() {
    try {
      const { keys } = await api.keys.list();
      setKeys(keys);
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true); setError(null);
    try {
      const k = await api.keys.create(name.trim());
      setJustCreated({ key: k.key, id: k.id });
      setName("");
      await refresh();
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this API key? Any apps using it will stop working immediately.")) return;
    await api.keys.remove(id);
    await refresh();
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-8 px-6 py-12">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">API Keys</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use a key to call the Frameforge render API. Each key is limited to <b>30 requests per month</b>.
          </p>
        </header>

        {justCreated && (
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">Copy your key now — it won't be shown again.</p>
                <code className="mt-2 block break-all rounded-md border border-border bg-background px-3 py-2 font-mono text-xs">
                  {justCreated.key}
                </code>
              </div>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(justCreated.key);
                  setCopied(true); setTimeout(() => setCopied(false), 1500);
                }}
                className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-2 text-xs hover:bg-accent"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <button onClick={() => setJustCreated(null)} className="mt-3 text-xs text-muted-foreground hover:underline">
              Dismiss
            </button>
          </div>
        )}

        <section className="rounded-xl border border-border bg-panel p-6">
          <form onSubmit={create} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Key name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Production server"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Generate key
            </button>
          </form>
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-panel">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Key</th>
                <th className="px-4 py-2">Usage</th>
                <th className="px-4 py-2">Created</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {keys.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-xs text-muted-foreground">No keys yet.</td></tr>
              )}
              {keys.map((k) => {
                const pct = Math.min(100, (k.used / k.limit) * 100);
                const exhausted = k.used >= k.limit;
                return (
                  <tr key={k.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <div className="font-medium">{k.name}</div>
                      {k.revokedAt && <div className="text-[10px] text-destructive">revoked</div>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{k.prefix}…</td>
                    <td className="px-4 py-3">
                      <div className="text-xs">{k.used} / {k.limit} this month</div>
                      <div className="mt-1 h-1.5 w-32 overflow-hidden rounded-full bg-secondary">
                        <div
                          className={`h-full ${exhausted ? "bg-destructive" : "bg-primary"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(k.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!k.revokedAt && (
                        <button
                          onClick={() => revoke(k.id)}
                          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-destructive"
                          title="Revoke"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="rounded-xl border border-border bg-panel p-6 text-sm">
          <h2 className="font-semibold">Using your key</h2>
          <pre className="mt-3 overflow-auto rounded-md border border-border bg-[#0b0d12] p-4 text-xs text-zinc-100">
{`curl -X POST $API/api/v1/templates/<id>/render \\
  -H "Authorization: Bearer ff_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"patches":[{"name":"title","patch":{"text":"Hello"}}]}'`}
          </pre>
          <p className="mt-3 text-xs text-muted-foreground">
            Requests beyond 30/month return <code className="rounded bg-secondary px-1">429 Too Many Requests</code>
            with <code className="rounded bg-secondary px-1">X-RateLimit-Reset</code> set to the next reset time.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
