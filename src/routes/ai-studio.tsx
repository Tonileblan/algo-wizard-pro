import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AIStrategyGenerator } from "@/components/AIStrategyGenerator";
import { PlanGate } from "@/components/PlanGate";

export const Route = createFileRoute("/ai-studio")({
  head: () => ({
    meta: [
      { title: "AI Strategy Studio — QuantForge" },
      {
        name: "description",
        content:
          "Prompt-to-Algorithm: describe tu idea de trading y obtén reglas, parámetros e indicadores listos para backtest.",
      },
      { property: "og:title", content: "AI Strategy Studio — QuantForge" },
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
