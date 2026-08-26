import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Dices, Loader2, Lock, Play, Radar, Sigma } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UpsellDialog, type UpsellState } from "@/components/UpsellDialog";
import { useAppState } from "@/hooks/use-app-state";
import { INSTRUMENTS } from "@/lib/market-symbols";
import { paramsFromStrategy } from "@/lib/strategy-types";
import { runBacktest } from "@/lib/backtest.functions";
import {
  MATRIX_ATR_MULTIPLIERS,
  MATRIX_RSI_PERIODS,
  formatCurrency,
  type BacktestResult,
  type Friction,
  type MatrixCell,
} from "@/lib/backtest-types";

const EMPTY_METRICS: BacktestResult["metrics"] = {
  netProfit: 0,
  totalTrades: 0,
  winRate: 0,
  profitFactor: 0,
  sharpe: 0,
  sortino: 0,
  maxDrawdown: 0,
  maxDrawdownPct: 0,
  maxConsecutiveLosses: 0,
  avgWin: 0,
  avgLoss: 0,
  expectancy: 0,
  cagr: 0,
};

export function BacktestAnalyzer() {
  const { can, activeStrategy } = useAppState();
  const execute = useServerFn(runBacktest);
  const [upsell, setUpsell] = useState<UpsellState>(null);
  const [dataset, setDataset] = useState(
    activeStrategy?.generated_logic.instrumentId ?? INSTRUMENTS[0]!.id,
  );
  const [friction, setFriction] = useState<Friction>({
    commissionPerTrade: 1.24,
    slippageTicks: 1,
    latencyMs: 45,
  });
  const [result, setResult] = useState<BacktestResult | null>(null);

  const strategyParams = useMemo(() => paramsFromStrategy(activeStrategy), [activeStrategy]);

  const mutation = useMutation({
    mutationFn: (input: { withMatrix: boolean }) =>
      execute({
        data: {
          instrumentId: dataset,
          friction,
          params: strategyParams,
          strategyId: activeStrategy?.id ?? null,
          withMatrix: input.withMatrix,
        },
      }),
    onSuccess: (data) => setResult(data),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "El backtest ha fallado."),
  });

  // Run once per dataset/strategy change with real market candles.
  useEffect(() => {
    mutation.mutate({ withMatrix: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset, activeStrategy?.id]);

  const equitySeries = useMemo(
    () => (result?.equity ?? []).filter((_, i) => i % 2 === 0),
    [result],
  );

  const m = result?.metrics ?? EMPTY_METRICS;
  const running = mutation.isPending;

  function requireElite(feature: string, action: () => void) {
    if (can("elite")) action();
    else setUpsell({ feature, requiredTier: "elite" });
  }

  return (
    <div className="space-y-6">
      <UpsellDialog state={upsell} onClose={() => setUpsell(null)} />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="outline" className="mb-2 font-mono text-[10px] tracking-widest">
            BACKTEST ENGINE · DATOS REALES
          </Badge>
          <h1 className="text-2xl font-bold">
            {activeStrategy?.generated_logic.name ?? "Reversión a la media — Nasdaq"}
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            {result
              ? `${result.trades.length} operaciones sobre ${result.dataset.bars} velas reales de ${result.dataset.symbol} (${result.dataset.source}) · slippage ${friction.slippageTicks} ticks · comisión $${friction.commissionPerTrade.toFixed(2)}/contrato`
              : running
                ? "Descargando histórico y ejecutando el motor..."
                : "Sin resultados todavía."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={dataset} onValueChange={setDataset}>
            <SelectTrigger className="w-[300px] font-mono text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INSTRUMENTS.map((d) => {
                const locked = !can(d.tier);
                return (
                  <SelectItem
                    key={d.id}
                    value={d.id}
                    disabled={locked}
                    className="font-mono text-xs"
                  >
                    {d.label} {locked ? `· ${d.tier.toUpperCase()}` : ""}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button
            variant="secondary"
            disabled={running}
            onClick={() => mutation.mutate({ withMatrix: false })}
          >
            {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            Re-ejecutar
          </Button>
        </div>
      </header>


      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <Metric label="Net P&L" value={formatCurrency(m.netProfit)} tone={m.netProfit >= 0 ? "profit" : "loss"} />
        <Metric label="Profit factor" value={m.profitFactor.toFixed(2)} tone={m.profitFactor >= 1.2 ? "profit" : "loss"} />
        <Metric label="Win rate" value={`${m.winRate}%`} />
        <Metric label="Sharpe" value={m.sharpe.toFixed(2)} />
        <Metric label="Sortino" value={m.sortino.toFixed(2)} />
        <Metric label="Max drawdown" value={`${m.maxDrawdownPct.toFixed(2)}%`} tone="loss" />
        <Metric label="Expectancy / trade" value={formatCurrency(m.expectancy)} tone={m.expectancy >= 0 ? "profit" : "loss"} />
        <Metric label="Avg win" value={formatCurrency(m.avgWin)} tone="profit" />
        <Metric label="Avg loss" value={formatCurrency(-m.avgLoss)} tone="loss" />
        <Metric label="Pérdidas consecutivas" value={String(m.maxConsecutiveLosses)} tone="loss" />
        <Metric label="CAGR" value={`${m.cagr}%`} />
        <Metric label="Trades" value={String(m.totalTrades)} />
      </div>

      <Tabs defaultValue="equity">
        <TabsList className="font-mono text-xs">
          <TabsTrigger value="equity">Equity & Drawdown</TabsTrigger>
          <TabsTrigger value="matrix">Matrix Optimization</TabsTrigger>
          <TabsTrigger value="log">Trade Log</TabsTrigger>
        </TabsList>

        <TabsContent value="equity" className="mt-4 space-y-4">
          <Card className="relative overflow-hidden bg-surface">
            <div className="quant-grid pointer-events-none absolute inset-0" />
            <CardHeader className="relative pb-0">
              <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                Curva de capital
              </h2>
            </CardHeader>
            <CardContent className="relative pt-4">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={equitySeries} margin={{ left: 8, right: 8 }}>
                    <defs>
                      <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-profit)" stopOpacity={0.55} />
                        <stop offset="100%" stopColor="var(--color-profit)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--color-border)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                      minTickGap={48}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                      tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`}
                      width={54}
                    />
                    <Tooltip content={<ChartTip suffix="" prefix="$" />} />
                    <Area
                      type="monotone"
                      dataKey="equity"
                      stroke="var(--color-profit)"
                      strokeWidth={1.6}
                      fill="url(#eq)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface">
            <CardHeader className="pb-0">
              <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                Drawdown relativo (%)
              </h2>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={equitySeries} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid stroke="var(--color-border)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                      minTickGap={48}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                      tickFormatter={(v: number) => `${v}%`}
                      width={54}
                    />
                    <Tooltip content={<ChartTip suffix="%" prefix="" />} />
                    <Bar dataKey="drawdown" fill="var(--color-loss)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <FrictionPanel
            friction={friction}
            running={running}
            onChange={setFriction}
            onRerun={() => mutation.mutate({ withMatrix: false })}
          />
        </TabsContent>

        <TabsContent value="matrix" className="mt-4">
          <MatrixHeatmap
            cells={result?.matrix ?? []}
            locked={!can("elite")}
            running={running}
            onRun={() => mutation.mutate({ withMatrix: true })}
            onLockedClick={() => setUpsell({ feature: "Matrix Optimization 3D", requiredTier: "elite" })}
            onMonteCarlo={() =>
              requireElite("simulaciones Monte Carlo", () => {
                toast.info("La simulación Monte Carlo se ejecutará sobre el último backtest real.");
              })
            }
          />
        </TabsContent>


        <TabsContent value="log" className="mt-4">
          <Card className="bg-surface">
            <CardHeader className="flex-row items-center justify-between pb-2">
              <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                Trade log · {result?.trades.length ?? 0} operaciones
              </h2>
              <Badge variant="outline" className="font-mono text-[10px]">
                trade_log jsonb
              </Badge>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[520px] rounded-md border border-border">
                <Table>
                  <TableHeader className="sticky top-0 bg-surface-2">
                    <TableRow>
                      <TableHead className="font-mono text-[10px] tracking-widest">#</TableHead>
                      <TableHead className="font-mono text-[10px] tracking-widest">FECHA</TableHead>
                      <TableHead className="font-mono text-[10px] tracking-widest">LADO</TableHead>
                      <TableHead className="text-right font-mono text-[10px] tracking-widest">ENTRY</TableHead>
                      <TableHead className="text-right font-mono text-[10px] tracking-widest">EXIT</TableHead>
                      <TableHead className="text-right font-mono text-[10px] tracking-widest">TICKS</TableHead>
                      <TableHead className="text-right font-mono text-[10px] tracking-widest">PNL</TableHead>
                      <TableHead className="text-right font-mono text-[10px] tracking-widest">ACUM.</TableHead>
                      <TableHead className="text-right font-mono text-[10px] tracking-widest">DUR.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(result?.trades ?? []).map((t) => (
                      <TableRow key={t.id} className="tabular text-xs">
                        <TableCell className="text-muted-foreground">{t.id}</TableCell>
                        <TableCell>{t.date.slice(0, 16).replace("T", " ")}</TableCell>
                        <TableCell className={t.side === "LONG" ? "text-profit" : "text-loss"}>
                          {t.side}
                        </TableCell>
                        <TableCell className="text-right">{t.entry.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{t.exit.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{t.ticks}</TableCell>
                        <TableCell
                          className={t.pnl >= 0 ? "text-right text-profit" : "text-right text-loss"}
                        >
                          {formatCurrency(t.pnl)}
                        </TableCell>
                        <TableCell
                          className={
                            t.cumulative >= 0 ? "text-right text-profit" : "text-right text-loss"
                          }
                        >
                          {formatCurrency(t.cumulative)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {t.duration}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChartTip({
  active,
  payload,
  label,
  prefix,
  suffix,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
  prefix: string;
  suffix: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 font-mono text-xs shadow-panel">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold">
        {prefix}
        {payload[0]!.value.toLocaleString("en-US")}
        {suffix}
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "profit" | "loss";
}) {
  return (
    <div className="panel px-3 py-2.5">
      <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">{label}</p>
      <p
        className={
          tone === "profit"
            ? "tabular mt-1 text-lg font-semibold text-profit"
            : tone === "loss"
              ? "tabular mt-1 text-lg font-semibold text-loss"
              : "tabular mt-1 text-lg font-semibold"
        }
      >
        {value}
      </p>
    </div>
  );
}

function FrictionPanel({
  friction,
  running,
  onChange,
  onRerun,
}: {
  friction: Friction;
  running: boolean;
  onChange: (f: Friction) => void;
  onRerun: () => void;
}) {
  return (
    <Card className="bg-surface">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Sigma className="size-4 text-muted-foreground" />
          <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            Panel de fricción · aplica y re-ejecuta
          </h2>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-3">
        <div className="space-y-2">
          <Label className="font-mono text-xs">Comisión por contrato ($)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={friction.commissionPerTrade}
            onChange={(e) =>
              onChange({ ...friction, commissionPerTrade: Number(e.target.value) || 0 })
            }
            className="tabular"
          />
        </div>
        <div className="space-y-3">
          <Label className="font-mono text-xs">
            Slippage: {friction.slippageTicks} ticks
          </Label>
          <Slider
            value={[friction.slippageTicks]}
            min={0}
            max={6}
            step={1}
            onValueChange={([v]) => onChange({ ...friction, slippageTicks: v ?? 0 })}
          />
        </div>
        <div className="space-y-3">
          <Label className="font-mono text-xs">Latencia: {friction.latencyMs} ms</Label>
          <Slider
            value={[friction.latencyMs]}
            min={0}
            max={400}
            step={5}
            onValueChange={([v]) => onChange({ ...friction, latencyMs: v ?? 0 })}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function cellClass(netProfit: number): string {
  if (netProfit > 6000) return "bg-profit text-neon-foreground";
  if (netProfit > 3500) return "bg-profit/70 text-neon-foreground";
  if (netProfit > 1500) return "bg-profit/45";
  if (netProfit > 0) return "bg-profit/20";
  if (netProfit > -1500) return "bg-loss/25";
  if (netProfit > -3500) return "bg-loss/50";
  return "bg-loss/80";
}

function MatrixHeatmap({
  cells,
  locked,
  running,
  onRun,
  onLockedClick,
  onMonteCarlo,
}: {
  cells: MatrixCell[];
  locked: boolean;
  running: boolean;
  onRun: () => void;
  onLockedClick: () => void;
  onMonteCarlo: () => void;
}) {
  const best = cells.length
    ? cells.reduce((a, b) => (b.netProfit > a.netProfit ? b : a), cells[0]!)
    : null;

  return (
    <Card className="bg-surface">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 pb-2">
        <div className="flex items-center gap-2">
          <Radar className="size-4 text-muted-foreground" />
          <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            Parameter matrix · RSI period × ATR multiplier
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {!locked && (
            <Button variant="default" size="sm" disabled={running} onClick={onRun}>
              {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              Ejecutar 80 combinaciones
            </Button>
          )}
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="secondary" size="sm" onClick={onMonteCarlo}>
                <Dices className="size-4" /> Optimización Monte Carlo
                {locked && <Lock className="size-3" />}
              </Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-72 border-primary/40">
              <p className="text-sm font-semibold">Monte Carlo · plan Elite</p>
              <p className="mt-1 text-xs text-muted-foreground">
                10.000 reordenaciones del trade log para estimar la distribución de drawdown y la
                probabilidad de ruina.
              </p>
            </HoverCardContent>
          </HoverCard>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <div className={locked ? "pointer-events-none blur-[3px] select-none" : ""}>
            <div className="overflow-x-auto">
              <div className="min-w-[720px]">
                <div
                  className="grid gap-1"
                  style={{
                    gridTemplateColumns: `72px repeat(${MATRIX_RSI_PERIODS.length}, minmax(0,1fr))`,
                  }}
                >
                  <div />
                  {MATRIX_RSI_PERIODS.map((p) => (
                    <div
                      key={p}
                      className="pb-1 text-center font-mono text-[10px] text-muted-foreground"
                    >
                      {p}
                    </div>
                  ))}
                  {MATRIX_ATR_MULTIPLIERS.map((atr) => (
                    <div key={atr} className="contents">
                      <div className="flex items-center justify-end pr-2 font-mono text-[10px] text-muted-foreground">
                        {atr.toFixed(2)}×
                      </div>
                      {MATRIX_RSI_PERIODS.map((rsi) => {
                        const cell = cells.find(
                          (c) => c.rsiPeriod === rsi && c.atrMultiplier === atr,
                        ) ?? { rsiPeriod: rsi, atrMultiplier: atr, netProfit: 0, sharpe: 0, trades: 0 };
                        return (
                          <HoverCard key={`${rsi}-${atr}`} openDelay={80}>
                            <HoverCardTrigger asChild>
                              <div
                                className={`tabular flex h-10 cursor-default items-center justify-center rounded text-[10px] font-medium transition-transform hover:scale-[1.06] ${cellClass(cell.netProfit)}`}
                              >
                                {(cell.netProfit / 1000).toFixed(1)}k
                              </div>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-56 font-mono text-xs">
                              <p>rsi_period: {cell.rsiPeriod}</p>
                              <p>atr_multiplier: {cell.atrMultiplier}</p>
                              <p
                                className={cell.netProfit >= 0 ? "text-profit" : "text-loss"}
                              >
                                net: {formatCurrency(cell.netProfit)}
                              </p>
                              <p>sharpe: {cell.sharpe}</p>
                              <p>trades: {cell.trades}</p>
                            </HoverCardContent>
                          </HoverCard>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {locked && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                type="button"
                onClick={onLockedClick}
                className="flex flex-col items-center gap-2 rounded-lg border border-primary/40 bg-background/85 px-6 py-5 text-center shadow-neon"
              >
                <Lock className="size-5 text-primary" />
                <span className="text-sm font-semibold">Matrix Optimization es Elite</span>
                <span className="max-w-xs text-xs text-muted-foreground">
                  Explora 80 combinaciones de parámetros y detecta zonas de robustez, no picos de
                  sobreoptimización.
                </span>
                <span className="mt-1 font-mono text-[10px] tracking-widest text-primary">
                  VER PLANES →
                </span>
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>PÉRDIDA</span>
            <span className="h-3 w-6 rounded bg-loss/80" />
            <span className="h-3 w-6 rounded bg-loss/40" />
            <span className="h-3 w-6 rounded bg-profit/30" />
            <span className="h-3 w-6 rounded bg-profit/70" />
            <span className="h-3 w-6 rounded bg-profit" />
            <span>PROFIT</span>
          </div>
          {!locked && best && (
            <span>
              Óptimo: rsi {best.rsiPeriod} / atr {best.atrMultiplier}× ·{" "}
              <span className="text-profit">{formatCurrency(best.netProfit)}</span>
            </span>
          )}
          {!locked && !best && <span>Ejecuta la matriz para ver la superficie de resultados.</span>}
        </div>
      </CardContent>
    </Card>
  );
}
