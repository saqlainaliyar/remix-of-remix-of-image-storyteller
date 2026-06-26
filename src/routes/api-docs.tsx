import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/api-docs")({
  head: () => ({
    meta: [
      { title: "API — Frameforge" },
      { name: "description", content: "Render images programmatically via REST API or webhook." },
    ],
  }),
  component: ApiDocsPage,
});

const REQ = `POST https://api.frameforge.app/v1/images
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "template": "tpl_8a96d079",
  "modifications": [
    { "name": "title",    "text": "Content That Actually *Drives Sales*" },
    { "name": "pretitle", "text": "The Marketing Podcast" },
    { "name": "image-container1", "image_url": "https://example.com/host.jpg" }
  ],
  "webhook_url": "https://your.app/webhooks/frameforge"
}`;

const RES = `{
  "uid": "img_01HZX...",
  "status": "completed",
  "image_url": "https://cdn.frameforge.app/img_01HZX.png",
  "width": 1280,
  "height": 720,
  "render_time_ms": 312
}`;

const CSV = `POST https://api.frameforge.app/v1/batch
Authorization: Bearer YOUR_API_KEY
Content-Type: multipart/form-data

template=tpl_8a96d079
file=@thumbnails.csv`;

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-auto rounded-lg border border-border bg-[#0b0d12] p-4 text-xs leading-relaxed text-zinc-100">
      <code>{children}</code>
    </pre>
  );
}

function ApiDocsPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-10 px-6 py-12">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">API</h1>
          <p className="mt-1 text-sm text-muted-foreground">Render any saved template via REST. Same engine the editor uses.</p>
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Generate a single image</h2>
          <p className="text-sm text-muted-foreground">Pass the template ID and a list of modifications keyed by layer name.</p>
          <CodeBlock>{REQ}</CodeBlock>
          <p className="text-sm text-muted-foreground">Response:</p>
          <CodeBlock>{RES}</CodeBlock>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Bulk render from CSV</h2>
          <p className="text-sm text-muted-foreground">Stream a CSV; each row becomes one rendered image. Map column headers to layer variables in your template.</p>
          <CodeBlock>{CSV}</CodeBlock>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Modification fields</h2>
          <div className="overflow-hidden rounded-lg border border-border bg-panel text-sm">
            <table className="w-full">
              <thead className="bg-secondary text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="px-4 py-2">Field</th><th className="px-4 py-2">Applies to</th><th className="px-4 py-2">Description</th></tr>
              </thead>
              <tbody className="text-xs">
                {[
                  ["text", "text layers", "Replaces layer content. Wrap *highlighted* spans in asterisks for secondary style."],
                  ["color", "text layers", "Overrides primary color."],
                  ["secondary_color", "text layers", "Overrides secondary highlight color."],
                  ["image_url", "image layers", "URL of an image to load into the container."],
                  ["fit", "image layers", "cover | contain | fill | stretch"],
                  ["hide", "any", "Set true to hide the layer from this render."],
                ].map((r) => (
                  <tr key={r[0]} className="border-t border-border">
                    <td className="px-4 py-2 font-mono">{r[0]}</td>
                    <td className="px-4 py-2 text-muted-foreground">{r[1]}</td>
                    <td className="px-4 py-2 text-muted-foreground">{r[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-dashed border-border bg-panel p-6 text-sm text-muted-foreground">
          Generate keys on the <a href="/api-keys" className="text-primary hover:underline">API Keys</a> page.
          Each key is limited to <b>30 requests per month</b>. Exceeding the limit returns
          <code className="mx-1 rounded bg-secondary px-1">429 Too Many Requests</code>
          with an <code className="rounded bg-secondary px-1">X-RateLimit-Reset</code> header.
        </section>
      </div>
    </AppShell>
  );
}
