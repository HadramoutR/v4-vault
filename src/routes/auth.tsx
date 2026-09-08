import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { FloatingNav } from "@/components/vault/FloatingNav";
import { Footer } from "@/components/vault/Footer";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — The Vault" },
      {
        name: "description",
        content:
          "Sign in to The Vault to track orders and delivery, save your configurations and manage your account.",
      },
      { property: "og:title", content: "Sign in — The Vault" },
      {
        property: "og:description",
        content: "Access your Vault account, orders and delivery tracking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthRoute,
});

function AuthRoute() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/account" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/account`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        setMessage("Check your inbox to confirm your email, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/account" });
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setMessage(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth/callback?next=/account`,
    });
    if (result.error) {
      setMessage("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/account" });
  };

  return (
    <div className="min-h-dvh bg-background">
      <FloatingNav />
      <main className="mx-auto w-full max-w-md px-4 pb-20 pt-32 sm:px-6 sm:pt-40">
        <p className="eyebrow mb-4">Account</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {mode === "signin" ? "Welcome back." : "Create your Vault account."}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Track orders and delivery, save configurations and check out faster.
        </p>

        <button
          onClick={google}
          className="btn-pill mt-8 w-full border border-hairline hover:bg-surface-elevated"
        >
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-hairline" />
          or
          <span className="h-px flex-1 bg-hairline" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label htmlFor="name" className="text-sm text-muted-foreground">
                Full name
              </label>
              <input
                id="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-hairline bg-surface px-4 text-sm outline-none focus:border-accent"
                autoComplete="name"
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="text-sm text-muted-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-hairline bg-surface px-4 text-sm outline-none focus:border-accent"
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm text-muted-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-hairline bg-surface px-4 text-sm outline-none focus:border-accent"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="btn-pill w-full bg-accent text-background hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        {message && (
          <p role="status" className="mt-4 text-sm text-muted-foreground">
            {message}
          </p>
        )}

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-6 text-sm text-accent hover:underline"
        >
          {mode === "signin"
            ? "New to The Vault? Create an account"
            : "Already have an account? Sign in"}
        </button>
      </main>
      <Footer />
    </div>
  );
}
