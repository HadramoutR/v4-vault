import { createFileRoute } from "@tanstack/react-router";
import { FloatingNav } from "@/components/vault/FloatingNav";
import { Hero } from "@/components/vault/Hero";
import { FeaturedGrid } from "@/components/vault/FeaturedGrid";
import { CategoryRail } from "@/components/vault/CategoryRail";
import { ValueProps } from "@/components/vault/ValueProps";
import { AccessoryCarousel } from "@/components/vault/AccessoryCarousel";
import { Footer } from "@/components/vault/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Vault Inc — Apple Authorized Reseller" },
      {
        name: "description",
        content:
          "Shop Mac, iPhone, Apple Watch, AirPods and accessories from The Vault Inc, an Apple Authorized Reseller in Nairobi.",
      },
      { property: "og:title", content: "The Vault Inc — Apple Authorized Reseller" },
      {
        property: "og:description",
        content:
          "Shop Mac, iPhone, Apple Watch, AirPods and accessories from The Vault Inc in Nairobi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-dvh bg-background">
      <FloatingNav />
      <main>
        <Hero />
        <FeaturedGrid />
        <CategoryRail />
        <ValueProps />
        <AccessoryCarousel />
      </main>
      <Footer />
    </div>
  );
}
