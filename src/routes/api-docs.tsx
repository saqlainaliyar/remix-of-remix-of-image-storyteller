import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/api-docs")({
  head: () => ({
    meta: [
      { title: "API — Frameforge" },
      { name: "description", content: "Render images programmatically via REST. Bannerbear-compatible modifications." },
    ],
  }),
  component: ApiDocsPage,
});

const CREATE_REQ = `curl -X POST https://api.frameforge.app/api/v1/images \\
  -H "Authorization: Bearer $FRAMEFORGE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "template": "tpl_8a96d079",
    "modifications": [
      { "name": "title",           "text": "Content That Actually *Drives Sales*", "color": "#ffffff" },
      { "name": "pretitle",        "text": "The Marketing Podcast",                 "text_align_h": "center" },
      { "name": "image-container1","image_url": "https://example.com/host.jpg",     "fill_type": "fill", "effect": "grayscale" },
      { "name": "overlay",         "gradient": ["#000000", "#111111"], "feather": 48, "featherSoftness": 1.4, "blendMode": "multiply" },
      { "name": "logo",            "hide": true }
    ],
    "webhook_url": "https://your.app/webhooks/frameforge",
    "transparent": false,
    "metadata": "order_12345"
  }'`;

const CREATE_RES = `HTTP/1.1 202 Accepted

{
  "uid": "img_01HZX9K3P7C4Q...",
  "status": "pending",
  "template": "tpl_8a96d079",
  "metadata": "order_12345",
  "webhook_url": "https://your.app/webhooks/frameforge",
  "self": "/api/v1/images/img_01HZX9K3P7C4Q..."
}`;

const SYNC_REQ = `curl -X POST "https://api.frameforge.app/api/v1/images?synchronous=1" \\
  -H "Authorization: Bearer $FRAMEFORGE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "template": "tpl_8a96d079", "modifications": [{ "name": "title", "text": "Hi" }] }'`;

const SYNC_RES = `HTTP/1.1 200 OK

{
  "uid": "img_...",
  "status": "completed",
  "template": "tpl_8a96d079",
  "image_url": "/exports/render-abcd1234.png",
  "width": 1280,
  "height": 720,
  "render_time_ms": 312,
  "completed_at": "2026-07-08T12:34:56.000Z"
}`;

const POLL_REQ = `curl https://api.frameforge.app/api/v1/images/img_01HZX9K3P7C4Q... \\
  -H "Authorization: Bearer $FRAMEFORGE_API_KEY"`;

const PATCH_REQ = `curl -X PATCH https://api.frameforge.app/api/v1/templates/tpl_8a96d079/layers/title \\
  -H "Authorization: Bearer $FRAMEFORGE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "New persistent headline",
    "color": "#ff0055",
    "font_family": "Big Shoulders Display",
    "text_align_h": "left"
  }'`;

const RENDER_REQ = `curl -X POST https://api.frameforge.app/api/v1/templates/tpl_8a96d079/render \\
  -H "Authorization: Bearer $FRAMEFORGE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "modifications": [
      { "name": "title",  "text": "One-off render" },
      { "name": "overlay","feather": 64, "featherSoftness": 1.2 }
    ]
  }'`;

const WEBHOOK_BODY = `POST https://your.app/webhooks/frameforge
X-Frameforge-Event: image.completed
Content-Type: application/json

{
  "uid": "img_...",
  "status": "completed",
  "template": "tpl_8a96d079",
  "image_url": "/exports/render-abcd1234.png",
  "width": 1280,
  "height": 720,
  "metadata": "order_12345",
  "completed_at": "2026-07-08T12:34:56.000Z"
}`;

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-auto rounded-lg border border-border bg-[#0b0d12] p-4 text-xs leading-relaxed text-zinc-100">
      <code>{children}</code>
    </pre>
  );
}

const MOD_ROWS: Array<[string, string, string]> = [
  ["name", "required, all", "The layer name in the template."],
  ["text", "text", "Replacement text. Wrap *highlighted* spans in asterisks."],
  ["color", "text, gradient, background", "Hex color, e.g. #FF0000."],
  ["background", "text", "Background fill for text container."],
  ["background_border_color", "text", "Border color for text container."],
  ["font_family", "text", "Font name."],
  ["text_align_h", "text", "left | center | right"],
  ["text_align_v", "text", "top | center | bottom"],
  ["font_family_2", "text", "Secondary font (for *highlighted* spans)."],
  ["color_2", "text", "Secondary color."],
  ["image_url", "image, background", "URL of an image to load."],
  ["effect", "image", "none | grayscale | sepia | blur | duotone"],
  ["anchor_x", "image", "left | center | right"],
  ["anchor_y", "image", "top | center | bottom"],
  ["fill_type", "image", "fill (cover) | fit (contain)"],
  ["disable_face_detect", "image", "Boolean. Accepted; no-op in current renderer."],
  ["disable_smart_crop", "image", "Boolean. Accepted; no-op in current renderer."],
  ["gradient", "any", 'Two-or-more color linear gradient e.g. ["#000","#FFF"].'],
  ["feather", "gradient", "Top-edge soft mask in px (Illustrator style)."],
  ["featherSoftness", "gradient", "0.2–3 (default 1). Falloff curve for top feather."],
  ["blendMode", "gradient", "CSS mix-blend-mode: multiply, screen, overlay, …"],
  ["shadow", "any", 'Shadow string, e.g. "5px 5px 0 #CCC".'],
  ["border_width", "any", "Border width in px."],
  ["border_color", "any", "Border color hex."],
  ["shift_x", "any", "Offset X from template position."],
  ["shift_y", "any", "Offset Y from template position."],
  ["target", "any", "Clickable URL — embedded in PDF renders only."],
  ["hide", "any", "Boolean. Set true to hide layer from this render."],
];

const TOP_ROWS: Array<[string, string, string]> = [
  ["template", "required", "Template UID."],
  ["modifications", "required", "List of layer modifications (see below)."],
  ["webhook_url", "optional", "URL to POST the completed image object to."],
  ["transparent", "optional", "Render PNG with transparent background."],
  ["metadata", "optional", "Any string, echoed back on the job + webhook."],
  ["render_pdf", "optional", "Reserved — PDF output not enabled yet."],
  ["template_version", "optional", "Reserved — accepted, not yet used."],
];

function ApiDocsPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-10 px-6 py-12">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">API</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bannerbear-compatible REST API. Render any saved template via a flat
            list of modifications. Same engine the editor uses.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Authentication &amp; limits</h2>
          <p className="text-sm text-muted-foreground">
            All endpoints require <code className="rounded bg-secondary px-1">Authorization: Bearer YOUR_API_KEY</code>.
            Generate keys on the <a href="/api-keys" className="text-primary hover:underline">API Keys</a> page.
            Each key is limited to <b>30 requests per month</b>. Rate-limit info is returned in
            <code className="mx-1 rounded bg-secondary px-1">X-RateLimit-*</code> headers; exceeding it returns
            <code className="mx-1 rounded bg-secondary px-1">429 Too Many Requests</code>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Create an image</h2>
          <p className="text-sm text-muted-foreground">
            <code className="rounded bg-secondary px-1">POST /api/v1/images</code> — responds with
            <code className="mx-1 rounded bg-secondary px-1">202 Accepted</code>, queues the render, then either POSTs to
            <code className="mx-1 rounded bg-secondary px-1">webhook_url</code> or is polled at
            <code className="mx-1 rounded bg-secondary px-1">GET /api/v1/images/:uid</code>.
          </p>
          <CodeBlock>{CREATE_REQ}</CodeBlock>
          <p className="text-sm text-muted-foreground">Response:</p>
          <CodeBlock>{CREATE_RES}</CodeBlock>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Synchronous mode</h2>
          <p className="text-sm text-muted-foreground">
            Append <code className="rounded bg-secondary px-1">?synchronous=1</code> to block until the render is complete
            and receive <code className="mx-1 rounded bg-secondary px-1">200 OK</code> with the finished image URL inline.
          </p>
          <CodeBlock>{SYNC_REQ}</CodeBlock>
          <CodeBlock>{SYNC_RES}</CodeBlock>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Poll for status</h2>
          <p className="text-sm text-muted-foreground">
            <code className="rounded bg-secondary px-1">GET /api/v1/images/:uid</code> returns the same object shape as the create response.
            <code className="mx-1 rounded bg-secondary px-1">status</code> transitions
            <code className="mx-1 rounded bg-secondary px-1">pending → completed</code> (or
            <code className="mx-1 rounded bg-secondary px-1">failed</code> with an <code className="mx-1 rounded bg-secondary px-1">error</code> string).
          </p>
          <CodeBlock>{POLL_REQ}</CodeBlock>
          <p className="text-sm text-muted-foreground">
            List every job with <code className="rounded bg-secondary px-1">GET /api/v1/images?status=completed&amp;limit=20</code>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Webhook payload</h2>
          <p className="text-sm text-muted-foreground">
            When the job completes, Frameforge POSTs the full image object to your <code className="rounded bg-secondary px-1">webhook_url</code>.
            Header <code className="rounded bg-secondary px-1">X-Frameforge-Event: image.completed</code> is set.
            Failures are retried up to 3× with backoff.
          </p>
          <CodeBlock>{WEBHOOK_BODY}</CodeBlock>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">One-off render (no job persistence)</h2>
          <p className="text-sm text-muted-foreground">
            <code className="rounded bg-secondary px-1">POST /api/v1/templates/:id/render</code> renders a template
            with in-flight modifications and returns the image URL immediately, without creating a job record.
          </p>
          <CodeBlock>{RENDER_REQ}</CodeBlock>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Persistently edit a layer</h2>
          <p className="text-sm text-muted-foreground">
            <code className="rounded bg-secondary px-1">PATCH /api/v1/templates/:id/layers/:layerName</code> deep-merges
            modification fields into the saved layer. Accepts the same field names as{" "}
            <code className="rounded bg-secondary px-1">modifications</code>.
          </p>
          <CodeBlock>{PATCH_REQ}</CodeBlock>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Top-level request fields</h2>
          <div className="overflow-hidden rounded-lg border border-border bg-panel text-sm">
            <table className="w-full">
              <thead className="bg-secondary text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Field</th>
                  <th className="px-4 py-2">Requirement</th>
                  <th className="px-4 py-2">Description</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {TOP_ROWS.map((r) => (
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

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Modification fields</h2>
          <p className="text-sm text-muted-foreground">
            Each modification is keyed by layer <code className="rounded bg-secondary px-1">name</code>.
            Fields that don't apply to the layer's type are ignored.
          </p>
          <div className="overflow-hidden rounded-lg border border-border bg-panel text-sm">
            <table className="w-full">
              <thead className="bg-secondary text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Field</th>
                  <th className="px-4 py-2">Applies to</th>
                  <th className="px-4 py-2">Description</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {MOD_ROWS.map((r) => (
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

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Errors</h2>
          <div className="overflow-hidden rounded-lg border border-border bg-panel text-sm">
            <table className="w-full">
              <thead className="bg-secondary text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="px-4 py-2">Status</th><th className="px-4 py-2">Meaning</th></tr>
              </thead>
              <tbody className="text-xs">
                <tr className="border-t border-border"><td className="px-4 py-2 font-mono">400</td><td className="px-4 py-2 text-muted-foreground">Invalid request body — see <code>issues[]</code>.</td></tr>
                <tr className="border-t border-border"><td className="px-4 py-2 font-mono">401</td><td className="px-4 py-2 text-muted-foreground">Missing or invalid API key.</td></tr>
                <tr className="border-t border-border"><td className="px-4 py-2 font-mono">404</td><td className="px-4 py-2 text-muted-foreground">Template or layer not found.</td></tr>
                <tr className="border-t border-border"><td className="px-4 py-2 font-mono">429</td><td className="px-4 py-2 text-muted-foreground">Monthly limit reached. See <code>X-RateLimit-Reset</code>.</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
