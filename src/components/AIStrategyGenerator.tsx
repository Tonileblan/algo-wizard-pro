import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BrainCircuit,
  CircleDot,
  Cpu,
  Gauge,
  Sparkles,
  Target,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAppState } from "@/hooks/use-app-state";
import {
  EXAMPLE_PROMPTS,
  GENERATION_STEPS,
  mockGenerateStrategy,
  type GeneratedStrategy,
} from "@/lib/mock-ai";

const RULE_LABEL: Record<string, string> = {
  entry: "ENTRADA",
  exit: "SALIDA",
  filter: "FILTRO",
  risk: "RIESGO",
};

export function AIStrategyGenerator() {
  const navigate = useNavigate();
  const { plan, strategies, aiGenerationsUsed, registerStrategy, setActiveStrategy } = useAppState();
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<"idle" | "thinking" | "done">("idle");
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState<GeneratedStrategy | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const quotaLeft =
    plan.aiGenerationsPerMonth === "unlimited"
      ? Infinity
      : plan.aiGenerationsPerMonth - aiGenerationsUsed;

  async function generate() {
    if (!prompt.trim()) {
      toast.error("Describe primero tu idea de estrategia.");
      return;
    }
    if (quotaLeft <= 0) {
      toast.error("Has agotado tus generaciones de IA este mes.");
      return;
    }
    setPhase("thinking");
    setResult(null);
    setStepIndex(0);
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = GENERATION_STEPS.map((_, i) =>
      window.setTimeout(() => setStepIndex(i), i * 700),
    );

    const [strategy] = await Promise.all([
      mockGenerateStrategy(prompt, "quantforge-llm-v3 (mock)"),
      new Promise((r) => setTimeout(r, GENERATION_STEPS.length * 700 + 400)),
    ]);

    setResult(strategy);
    registerStrategy(strategy);
    setActiveStrategy(strategy);
    setPhase("done");
  }

  return (
    <div className="space-y-8">
      <section className="ai-glow relative overflow-hidden rounded-xl border border-primary/30 p-6 sm:p-8">
        <div className="relative space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="font-mono text-[10px] tracking-widest">
              <Sparkles className="mr-1 size-3" /> PROMPT-TO-ALGORITHM
            </Badge>
            <span className="font-mono text-[11px] text-muted-foreground">
              modelo: quantforge-llm-v3 ·{" "}
              {quotaLeft === Infinity ? "generaciones ilimitadas" : `${quotaLeft} generaciones restantes`}
            </span>
          </div>
          <h1 className="text-2xl font-bold sm:text-3xl">Describe tu estrategia</h1>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            placeholder="Ej: Quiero una estrategia de reversión a la media en el Nasdaq, usando el VWAP y confirmación de RSI sobrevendido, con un stop loss fijo de 20 ticks."
            className="resize-none border-primary/25 bg-background/70 text-base md:text-base"
          />
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPrompt(p)}
                className="max-w-full truncate rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                {p.slice(0, 58)}…
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={generate} disabled={phase === "thinking"}>
              <Wand2 className="size-4" />
              {phase === "thinking" ? "Generando..." : "Generar estrategia"}
            </Button>
            <span className="font-mono text-[11px] text-muted-foreground">
              La lógica generada se guarda en ai_generated_strategies
            </span>
          </div>
        </div>
      </section>

      {phase === "thinking" && <ThinkingState stepIndex={stepIndex} />}

      {phase === "done" && result && (
        <StrategyOutput
          strategy={result}
          onBacktest={() => {
            setActiveStrategy(result);
            navigate({ to: "/backtest-engine" });
          }}
        />
      )}

      {strategies.length > 0 && (
        <section>
          <h2 className="mb-3 font-mono text-xs tracking-widest text-muted-foreground uppercase">
            Historial de generaciones
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {strategies.slice(0, 6).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setResult(s);
                  setActiveStrategy(s);
                  setPhase("done");
                }}
                className="panel p-4 text-left transition-colors hover:border-primary/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{s.generated_logic.name}</span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {s.generated_logic.style}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {s.prompt_original}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ThinkingState({ stepIndex }: { stepIndex: number }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Card className="bg-surface">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Cpu className="size-4 animate-pulse text-primary" /> Motor de razonamiento
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {GENERATION_STEPS.map((step, i) => (
            <div key={step} className="flex items-start gap-2 font-mono text-xs">
              <CircleDot
                className={
                  i < stepIndex
                    ? "mt-0.5 size-3.5 shrink-0 text-profit"
                    : i === stepIndex
                      ? "mt-0.5 size-3.5 shrink-0 animate-pulse text-primary"
                      : "mt-0.5 size-3.5 shrink-0 text-muted-foreground/40"
                }
              />
              <span className={i <= stepIndex ? "" : "text-muted-foreground/40"}>{step}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-surface">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-56" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-9/12" />
          <Separator />
          <div className="grid gap-2 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StrategyOutput({
  strategy,
  onBacktest,
}: {
  strategy: GeneratedStrategy;
  onBacktest: () => void;
}) {
  const logic = strategy.generated_logic;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="outline" className="mb-2 font-mono text-[10px] tracking-widest">
            <BrainCircuit className="mr-1 size-3 text-primary" /> ESTRATEGIA GENERADA
          </Badge>
          <h2 className="text-2xl font-bold">{logic.name}</h2>
          <p className="font-mono text-xs text-muted-foreground">
            {logic.instrument} · {logic.timeframe} · {logic.style} · {strategy.ai_model_used}
          </p>
        </div>
        <Button onClick={onBacktest}>
          Llevar a Backtest <ArrowRight className="size-4" />
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricTile
          icon={<Target className="size-4 text-primary" />}
          label="Win rate estimado"
          value={`${logic.expected.winRate}%`}
        />
        <MetricTile
          icon={<Gauge className="size-4 text-primary" />}
          label="Profit factor estimado"
          value={logic.expected.profitFactor.toFixed(2)}
        />
        <MetricTile
          icon={<CircleDot className="size-4 text-primary" />}
          label="Operaciones / semana"
          value={String(logic.expected.tradesPerWeek)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="bg-surface">
          <CardHeader className="pb-2">
            <h3 className="text-sm font-semibold">Lógica interpretada</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{logic.thesis}</p>
            <Separator />
            <ul className="space-y-3">
              {logic.rules.map((rule, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <Badge
                    variant="secondary"
                    className="h-fit shrink-0 font-mono text-[9px] tracking-widest"
                  >
                    {RULE_LABEL[rule.kind]}
                  </Badge>
                  <span className="leading-relaxed">{rule.text}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-surface">
            <CardHeader className="pb-2">
              <h3 className="text-sm font-semibold">Parámetros propuestos</h3>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64 pr-3">
                <div className="space-y-1.5">
                  {logic.parameters.map((p) => (
                    <div
                      key={p.name}
                      className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-2 font-mono text-xs"
                    >
                      <span className="text-muted-foreground">{p.name}</span>
                      <span className="flex items-center gap-2">
                        <span className="font-semibold">
                          {p.value}
                          {p.unit ? ` ${p.unit}` : ""}
                        </span>
                        {p.optimizable && (
                          <Badge variant="outline" className="text-[9px]">
                            OPT
                          </Badge>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="bg-surface">
            <CardHeader className="pb-2">
              <h3 className="text-sm font-semibold">Indicadores</h3>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {logic.indicators.map((i) => (
                <Badge key={i} variant="secondary" className="font-mono text-[10px]">
                  {i}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="tabular mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
