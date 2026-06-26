import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth-store";
import { ArrowRight, Image, Layers, Sparkles, Zap, Code2, Database } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Frameforge — Automated image generation for marketers & devs" },
      { name: "description", content: "Design templates once, then render thousands of branded images via API, CSV batch, or the visual editor. A modern Bannerbear alternative." },
      { property: "og:title", content: "Frameforge — Automated image generation" },
      { property: "og:description", content: "Templates + API + CSV batch + brand kit. Generate on-brand images at scale." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user } = useAuth();
  const ctaTo = user ? "/editor" : "/auth";
  const ctaLabel = user ? "Launch editor" : "Sign in to start";
  return (
    <AppShell>
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-background to-secondary/40">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" /> New — Secondary text styles & batch CSV rendering
          </span>
          <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-semibold tracking-tight text-foreground md:text-6xl">
            Design once.<br />
            <span className="text-primary">Render a thousand</span> on-brand images.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Frameforge is a modern, no-fuss image automation studio. Build templates in the visual
            editor, then generate at scale via API or CSV — perfect for thumbnails, OG images,
            ads, and personalized campaigns.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to={ctaTo} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90">
              {ctaLabel} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to={user ? "/templates" : "/auth"} className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-5 py-3 text-sm font-medium hover:bg-accent">
              {user ? "Browse templates" : "Create account"}
            </Link>
          </div>

          <div className="mx-auto mt-16 max-w-5xl overflow-hidden rounded-xl border border-border bg-panel shadow-2xl">
            <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
              <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
              <div className="ml-3 text-[11px] text-muted-foreground">frameforge.app / editor</div>
            </div>
            <div className="grid h-[420px] grid-cols-[200px_1fr_220px]">
              <div className="border-r border-border bg-secondary/40 p-3 text-[11px] text-muted-foreground">
                <div className="mb-2 font-semibold text-foreground">Layers</div>
                {["title", "pretitle", "image-container", "background"].map((n) => (
                  <div key={n} className="my-1 rounded px-2 py-1 hover:bg-background">{n}</div>
                ))}
              </div>
              <div className="checker-bg flex items-center justify-center p-6">
                <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-md bg-[#13ffb3] shadow-lg">
                  <div className="absolute left-1/2 top-[22%] -translate-x-1/2 bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-black">The Marketing<br/>Podcast</div>
                  <div className="absolute bottom-[10%] left-1/2 w-[88%] -translate-x-1/2 space-y-0.5 text-center">
                    <div className="bg-black px-2 py-1 text-xl font-black uppercase leading-none text-white">Content That Actually</div>
                    <div className="inline-block bg-black px-2 py-1 text-xl font-black uppercase leading-none" style={{color:"#13ffb3"}}>Drives Sales</div>
                  </div>
                </div>
              </div>
              <div className="border-l border-border bg-secondary/40 p-3 text-[11px] text-muted-foreground">
                <div className="mb-2 font-semibold text-foreground">Text properties</div>
                <div className="space-y-1.5">
                  <div className="rounded bg-background px-2 py-1">Font · Big Shoulders</div>
                  <div className="rounded bg-background px-2 py-1">Size · 88</div>
                  <div className="rounded bg-background px-2 py-1">Primary · #fff on #000</div>
                  <div className="rounded bg-background px-2 py-1">Secondary · #13ffb3</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight">Everything you need to ship branded images at scale.</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { icon: Layers, title: "Layered editor", desc: "Text, images, backgrounds with primary + secondary styles, masks, shadows, and smart anchoring." },
              { icon: Image, title: "Canvas presets", desc: "YouTube, Instagram, LinkedIn, X, OG — pixel-perfect dimensions for every platform." },
              { icon: Zap, title: "Auto-fit text", desc: "Long titles compress automatically. Inline *highlighted* spans get their own color, weight, and background." },
              { icon: Code2, title: "Render API", desc: "POST a JSON payload with your variables and get a PNG back. Same renderer as the editor." },
              { icon: Database, title: "CSV batch", desc: "Drop a CSV, map columns to template variables, download a zip of rendered images." },
              { icon: Sparkles, title: "Brand kit", desc: "Saved colors, fonts, and logos available across every template you create." },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-panel p-6">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">Start designing in seconds.</h2>
          <p className="mt-3 text-muted-foreground">No accounts, no setup. Your work stays in your browser until you're ready to ship.</p>
          <Link to="/editor" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90">
            Open the editor <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
