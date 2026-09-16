import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { IPHONE_GENERATIONS, MACS } from "@/lib/catalog";
import { Logo } from "./Logo";
import { useCart } from "@/lib/cart";
import { supabase } from "@/integrations/supabase/client";

const TABS = [
  { label: "Mac", to: "/mac" as const },
  { label: "iPhone", to: "/iphone" as const },
  { label: "Accessories", to: "/accessories" as const },
];

export function FloatingNav() {
  const [scrolled, setScrolled] = useState(false);
  const cart = useCart();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") setSignedIn(true);
      if (event === "SIGNED_OUT") setSignedIn(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled ? "pt-2 sm:pt-3" : "pt-4 sm:pt-6"
      }`}
    >
      <div className="mx-auto max-w-[1440px] px-3 sm:px-6">
        <nav
          className={`glass-panel grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-full transition-all duration-500 ${
            scrolled ? "h-12 px-3 sm:h-14 sm:px-5" : "h-14 px-4 sm:h-16 sm:px-7"
          }`}
        >
          <Logo />

          <ul className="hidden min-w-0 items-center justify-center gap-1 md:flex">
            {TABS.map((item) => (
              <li key={item.label}>
                <Link
                  to={item.to}
                  className="inline-block rounded-full px-4 py-2 text-sm text-foreground/80 transition-colors duration-300 hover:bg-surface-elevated hover:text-foreground"
                  activeProps={{ className: "bg-surface-elevated text-foreground" }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <span className="md:hidden" aria-hidden />

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <button
              aria-label="Search"
              className="grid h-11 w-11 place-items-center rounded-full text-foreground/70 transition-colors hover:bg-surface-elevated hover:text-foreground"
            >
              <Search className="h-[18px] w-[18px]" strokeWidth={1.6} />
            </button>
            <Link
              to={signedIn ? "/account" : "/auth"}
              aria-label={signedIn ? "My account" : "Sign in"}
              className="hidden h-11 w-11 place-items-center rounded-full text-foreground/70 transition-colors hover:bg-surface-elevated hover:text-foreground sm:grid"
            >
              <User className="h-[18px] w-[18px]" strokeWidth={1.6} />
            </Link>
            <button
              aria-label={`Bag, ${cart.count} item${cart.count === 1 ? "" : "s"}`}
              onClick={() => cart.setOpen(true)}
              className="relative grid h-11 w-11 place-items-center rounded-full text-foreground/70 transition-colors hover:bg-surface-elevated hover:text-foreground"
            >
              <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.6} />
              {cart.count > 0 && (
                <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-medium text-background">
                  {cart.count}
                </span>
              )}
            </button>
            <button
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="grid h-11 w-11 place-items-center rounded-full text-foreground/80 transition-colors hover:bg-surface-elevated hover:text-foreground md:hidden"
            >
              {open ? (
                <X className="h-5 w-5" strokeWidth={1.6} />
              ) : (
                <Menu className="h-5 w-5" strokeWidth={1.6} />
              )}
            </button>
          </div>
        </nav>
      </div>

      {open && (
        <div className="md:hidden">
          <button
            aria-label="Close menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 -z-10 cursor-default bg-background/60 backdrop-blur-sm"
          />
          <div className="mx-auto mt-3 max-h-[75dvh] max-w-[1440px] overflow-y-auto px-3 sm:px-6">
            <div className="glass-panel rounded-[1.75rem] p-5">
              <nav aria-label="Categories" className="space-y-6">
                <div>
                  <p className="eyebrow mb-3">Shop</p>
                  <ul className="space-y-1">
                    {TABS.map((t) => (
                      <li key={t.to}>
                        <Link
                          to={t.to}
                          onClick={() => setOpen(false)}
                          className="block rounded-2xl px-3 py-3 text-lg font-medium transition-colors hover:bg-surface-elevated"
                        >
                          {t.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="eyebrow mb-3">iPhone lineup</p>
                  <div className="space-y-4">
                    {IPHONE_GENERATIONS.map((g) => (
                      <div key={g.generation}>
                        <p className="px-3 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          iPhone {g.generation} · {g.year}
                        </p>
                        <ul className="mt-1 grid grid-cols-2 gap-1 sm:grid-cols-3">
                          {g.models.map((m) => (
                            <li key={m.slug}>
                              <Link
                                to="/iphone/$model"
                                params={{ model: m.slug }}
                                onClick={() => setOpen(false)}
                                className="block rounded-2xl px-3 py-3 text-sm text-foreground/85 transition-colors hover:bg-surface-elevated"
                              >
                                {m.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="eyebrow mb-3">Mac lineup</p>
                  <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                    {MACS.map((m) => (
                      <li key={m.slug}>
                        <Link
                          to="/mac"
                          hash={m.slug}
                          onClick={() => setOpen(false)}
                          className="block rounded-2xl px-3 py-3 text-sm text-foreground/85 transition-colors hover:bg-surface-elevated"
                        >
                          {m.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </nav>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
