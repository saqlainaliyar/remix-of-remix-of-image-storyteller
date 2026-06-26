import { useEffect, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { authStore, useAuth } from "../lib/auth-store";

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading, token } = useAuth();

  useEffect(() => {
    if (token && !user && !loading) void authStore.hydrate();
  }, [token, user, loading]);

  if (!token || (token && !user && loading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 text-center">
          <h2 className="text-lg font-semibold text-foreground">Sign in required</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You need an account to access this page.
          </p>
          <Link
            to="/auth"
            className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function AuthBadge() {
  const { user } = useAuth();
  if (!user) {
    return (
      <Link to="/auth" className="text-xs font-medium text-primary hover:underline">
        Sign in
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="truncate max-w-[160px]">{user.email}</span>
      <button
        onClick={() => void authStore.logout()}
        className="rounded border border-border px-2 py-0.5 hover:bg-accent"
      >
        Sign out
      </button>
    </div>
  );
}
