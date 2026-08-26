import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AIStrategyGenerator } from "@/components/AIStrategyGenerator";
import { PlanGate } from "@/components/PlanGate";

export const Route = createFileRoute("/_authenticated/ai-studio")({
  head: () => ({
    meta: [
      { title: "AI Strategy Studio — Quantitrading" },
      {
        name: "description",
        content:
          "Prompt-to-Algorithm: describe tu idea de trading y obtén reglas, parámetros e indicadores listos para backtest.",
      },
      { property: "og:title", content: "AI Strategy Studio — Quantitrading" },
      {
        property: "og:description",
        content: "Genera estrategias cuantitativas completas a partir de lenguaje natural.",
      },
    ],
  }),
  component: () => (
    <AppShell>
      <PlanGate
        required="pro"
        title="AI Strategy Studio es una función Pro"
        description="Genera estrategias completas desde lenguaje natural: reglas de entrada y salida, gestión de riesgo y parámetros optimizables listos para validar."
      >
        <AIStrategyGenerator />
      </PlanGate>
    </AppShell>
  ),
});
