import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { FloatingNav } from "@/components/vault/FloatingNav";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [
    { title: "Completing sign in — The Vault Inc" },
    { name: "description", content: "Completing your secure sign in to The Vault Inc." },
    { property: "og:title", content: "Completing sign in — The Vault Inc" },
    { property: "og:description", content: "Completing your secure sign in to The Vault Inc." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: AuthCallbackRoute,
});

function AuthCallbackRoute() {
  const [message, setMessage] = useState("Completing your sign in…");
  useEffect(() => {
    let active = true;
    const finish = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) await supabase.auth.exchangeCodeForSession(code);
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error || !data.session) return setMessage("We could not complete your sign in. Please try again.");
      const requested = params.get("next") ?? "/account";
      window.location.replace(requested.startsWith("/") && !requested.startsWith("//") ? requested : "/account");
    };
    void finish();
    return () => { active = false; };
  }, []);
  return <div className="min-h-dvh bg-background"><FloatingNav /><main className="mx-auto flex min-h-dvh max-w-md items-center px-6 text-center"><div className="w-full"><p className="eyebrow mb-4">The Vault Inc</p><h1 className="text-3xl font-semibold tracking-tight">{message}</h1></div></main></div>;
}