import { Link, useRouterState } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { AuthBadge } from "@/components/AuthGate";
import { useAuth } from "@/lib/auth-store";

const NAV = [
  { to: "/", label: "Home", auth: false },
  { to: "/editor", label: "Editor", auth: true },
  { to: "/templates", label: "Templates", auth: true },
  { to: "/brand-kit", label: "Brand Kit", auth: true },
  { to: "/batch", label: "Batch Render", auth: true },
  { to: "/api-keys", label: "API Keys", auth: true },
  { to: "/api-docs", label: "API Docs", auth: false },
];

export function AppShell({ children, fullBleed = false }: { children: ReactNode; fullBleed?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-panel px-4">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Frameforge</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.filter((n) => !n.auth || user).map((item) => {
              const active =
                item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <AuthBadge />
          {user ? (
            <Link
              to="/editor"
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              Open Editor
            </Link>
          ) : (
            <Link
              to="/auth"
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>
      <main className={fullBleed ? "flex-1 overflow-hidden" : "flex-1 overflow-auto"}>
        {children}
      </main>
    </div>
  );
}
