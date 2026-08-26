import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { StrategyWizard } from "@/components/StrategyWizard";

export const Route = createFileRoute("/_authenticated/strategy-builder")({
  head: () => ({
    meta: [
      { title: "Strategy Builder — wizard de 9 pasos | Quantitrading" },
      {
        name: "description",
        content:
          "Construye tu estrategia paso a paso: instrumento, filtros de sesión, indicadores, reglas, riesgo, sizing y exportación.",
      },
      { property: "og:title", content: "Strategy Builder — Quantitrading" },
      {
        property: "og:description",
        content: "Wizard manual de 9 pasos con control total sobre la lógica de tu algoritmo.",
      },
    ],
  }),
  component: () => (
    <AppShell>
      <StrategyWizard />
    </AppShell>
  ),
});
