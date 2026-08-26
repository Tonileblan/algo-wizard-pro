import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BrainCircuit, Gauge, LineChart, Radar, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quantitrading — Prompt-to-Algorithm para traders sistemáticos" },
      {
        name: "description",
        content:
          "Convierte una idea en lenguaje natural en una estrategia algorítmica validada: IA generativa, backtesting a nivel de tick y matrix optimization.",
      },
      { property: "og:title", content: "Quantitrading — Prompt-to-Algorithm" },
      {
        property: "og:description",
        content:
          "IA generativa de estrategias, backtesting con fricción real y optimización de parámetros en un solo motor.",
      },
    ],
  }),
  component: Landing,
});

const PILLARS = [
  {
    icon: BrainCircuit,
    title: "AI Strategy Studio",
    body: "Describe la ineficiencia que quieres explotar y obtén reglas, parámetros e indicadores listos para validar.",
  },
  {
    icon: LineChart,
    title: "Backtesting con fricción",
    body: "Comisiones, slippage y latencia aplicados sobre el log completo de operaciones, no sobre promedios.",
  },
  {
    icon: Radar,
    title: "Matrix Optimization",
    body: "Cruza parámetros en una matriz de calor y localiza zonas de robustez en lugar de picos frágiles.",
  },
  {
    icon: Gauge,
    title: "Export ejecutable",
    body: "Paquetiza la lógica para NinjaTrader o conéctala a Tradovate cuando la curva te convenza.",
  },
];

function Landing() {
  return (
    <AppShell>
      <section className="relative overflow-hidden rounded-2xl border border-border px-6 py-16 sm:px-12 sm:py-20">
        <div className="quant-grid pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-3xl text-center">
          <Badge variant="outline" className="mb-5 font-mono text-[10px] tracking-widest">
            <Terminal className="mr-1 size-3 text-primary" /> ALGO-TRADING ENGINE
          </Badge>
          <h1 className="text-4xl font-bold sm:text-5xl">
            De una frase a un algoritmo <span className="text-primary">validado</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-muted-foreground">
            Quantitrading convierte tu hipótesis de mercado en lógica cuantitativa estructurada, la
            somete a un backtest con fricción real y te muestra dónde vive el edge.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/ai-studio">
                Abrir AI Studio <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link to="/backtest-engine">Ver backtest de ejemplo</Link>
            </Button>
          </div>
          <p className="mt-6 font-mono text-[11px] text-muted-foreground">
            Free · Pro $49/mes · Elite $149/mes
          </p>
        </div>
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PILLARS.map(({ icon: Icon, title, body }) => (
          <article key={title} className="panel p-5">
            <Icon className="size-5 text-primary" />
            <h2 className="mt-3 font-semibold">{title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
          </article>
        ))}
      </section>

      <section className="panel mt-6 grid gap-6 p-8 sm:grid-cols-3">
        {[
          ["420", "operaciones por backtest simulado"],
          ["80", "combinaciones en la matriz de optimización"],
          ["3", "niveles de suscripción, sin contratos"],
        ].map(([value, label]) => (
          <div key={label}>
            <p className="tabular text-3xl font-bold text-primary">{value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{label}</p>
          </div>
        ))}
      </section>
    </AppShell>
  );
}
