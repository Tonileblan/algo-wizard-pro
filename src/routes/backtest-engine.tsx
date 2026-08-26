import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { BacktestAnalyzer } from "@/components/BacktestAnalyzer";
import { PlanGate } from "@/components/PlanGate";

export const Route = createFileRoute("/backtest-engine")({
  head: () => ({
    meta: [
      { title: "Backtest Engine — QuantForge" },
      {
        name: "description",
        content:
          "Análisis profundo de backtesting: curva de capital, drawdown relativo, matriz de optimización y log completo de operaciones.",
      },
      { property: "og:title", content: "Backtest Engine — QuantForge" },
      {
        property: "og:description",
        content: "Equity, drawdown, heatmap de parámetros y modelo de fricción en un solo panel.",
      },
    ],
  }),
  component: () => (
    <AppShell>
      <PlanGate
        required="pro"
        title="El motor de backtesting avanzado es Pro"
        description="Curva de capital, drawdown relativo, log completo de operaciones y modelo de fricción con comisiones, slippage y latencia."
      >
        <BacktestAnalyzer />
      </PlanGate>
    </AppShell>
  ),
});
