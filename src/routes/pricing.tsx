import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PricingView } from "@/components/PricingView";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Planes y precios — QuantForge" },
      {
        name: "description",
        content:
          "Free, Pro ($49/mes) y Elite ($149/mes): IA generativa de estrategias, backtesting a nivel de tick y matrix optimization.",
      },
      { property: "og:title", content: "Planes y precios — QuantForge" },
      {
        property: "og:description",
        content: "Compara Free, Pro y Elite y elige la potencia de tu infraestructura quant.",
      },
    ],
  }),
  component: () => (
    <AppShell>
      <PricingView />
    </AppShell>
  ),
});
