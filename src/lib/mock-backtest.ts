/**
 * Deterministic mock backtest engine.
 * Mirrors the shape of the future `advanced_backtests` row (trade_log,
 * parameter_matrix, friction assumptions) so the analyzer UI is fully testable.
 */

export type Trade = {
  id: number;
  date: string;
  side: "LONG" | "SHORT";
  entry: number;
  exit: number;
  qty: number;
  ticks: number;
  pnl: number;
  cumulative: number;
  duration: string;
};

export type EquityPoint = {
  date: string;
  equity: number;
  drawdown: number;
};

export type Friction = {
  commissionPerTrade: number;
  slippageTicks: number;
  latencyMs: number;
};

export type BacktestMetrics = {
  netProfit: number;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  sharpe: number;
  sortino: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  maxConsecutiveLosses: number;
  avgWin: number;
  avgLoss: number;
  expectancy: number;
  cagr: number;
};

export type BacktestResult = {
  metrics: BacktestMetrics;
  equity: EquityPoint[];
  trades: Trade[];
  matrix: MatrixCell[];
};

export type MatrixCell = {
  rsiPeriod: number;
  atrMultiplier: number;
  netProfit: number;
  sharpe: number;
  trades: number;
};

const TICK_VALUE = 0.5; // MNQ: $0.50 per tick
const START_EQUITY = 25000;

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function runMockBacktest(
  strategyKey: string,
  friction: Friction,
  tradeCount = 420,
): BacktestResult {
  const rnd = mulberry(seedFrom(strategyKey));
  const trades: Trade[] = [];
  const equity: EquityPoint[] = [];

  let cumulative = 0;
  let peak = START_EQUITY;
  let maxDd = 0;
  let maxDdPct = 0;
  let wins = 0;
  let grossWin = 0;
  let grossLoss = 0;
  let consecutive = 0;
  let maxConsecutive = 0;
  const returns: number[] = [];

  const start = new Date("2024-01-02T14:35:00Z");

  for (let i = 0; i < tradeCount; i++) {
    const winner = rnd() < 0.46;
    const rawTicks = winner ? 12 + Math.floor(rnd() * 46) : -(8 + Math.floor(rnd() * 26));
    const ticks = rawTicks - Math.sign(rawTicks || 1) * 0 - friction.slippageTicks;
    const qty = 2;
    const latencyPenalty = (friction.latencyMs / 100) * 0.35 * qty;
    const pnl = Number(
      (ticks * TICK_VALUE * qty - friction.commissionPerTrade * qty - latencyPenalty).toFixed(2),
    );

    cumulative = Number((cumulative + pnl).toFixed(2));
    const date = new Date(start.getTime() + i * 1000 * 60 * 60 * 9.3);
    const entry = Number((17800 + rnd() * 2400).toFixed(2));
    const exit = Number((entry + ticks * 0.25 * (rnd() > 0.5 ? 1 : -1)).toFixed(2));

    if (pnl > 0) {
      wins++;
      grossWin += pnl;
      consecutive = 0;
    } else {
      grossLoss += Math.abs(pnl);
      consecutive++;
      maxConsecutive = Math.max(maxConsecutive, consecutive);
    }

    const eq = START_EQUITY + cumulative;
    peak = Math.max(peak, eq);
    const dd = eq - peak;
    const ddPct = (dd / peak) * 100;
    maxDd = Math.min(maxDd, dd);
    maxDdPct = Math.min(maxDdPct, ddPct);
    returns.push(pnl / START_EQUITY);

    trades.push({
      id: i + 1,
      date: date.toISOString(),
      side: rnd() > 0.48 ? "LONG" : "SHORT",
      entry,
      exit,
      qty,
      ticks,
      pnl,
      cumulative,
      duration: `${4 + Math.floor(rnd() * 55)}m`,
    });

    equity.push({
      date: date.toISOString().slice(0, 10),
      equity: Number(eq.toFixed(2)),
      drawdown: Number(ddPct.toFixed(2)),
    });
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const sd = Math.sqrt(returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length);
  const downside = returns.filter((r) => r < 0);
  const dsd = Math.sqrt(downside.reduce((a, b) => a + b * b, 0) / Math.max(downside.length, 1));
  const annualize = Math.sqrt(252 * (tradeCount / 252));

  const years = tradeCount / 252;
  const finalEquity = START_EQUITY + cumulative;

  const metrics: BacktestMetrics = {
    netProfit: Number(cumulative.toFixed(2)),
    totalTrades: tradeCount,
    winRate: Number(((wins / tradeCount) * 100).toFixed(1)),
    profitFactor: Number((grossWin / Math.max(grossLoss, 1)).toFixed(2)),
    sharpe: Number(((mean / (sd || 1)) * annualize).toFixed(2)),
    sortino: Number(((mean / (dsd || 1)) * annualize).toFixed(2)),
    maxDrawdown: Number(maxDd.toFixed(2)),
    maxDrawdownPct: Number(maxDdPct.toFixed(2)),
    maxConsecutiveLosses: maxConsecutive,
    avgWin: Number((grossWin / Math.max(wins, 1)).toFixed(2)),
    avgLoss: Number((grossLoss / Math.max(tradeCount - wins, 1)).toFixed(2)),
    expectancy: Number((cumulative / tradeCount).toFixed(2)),
    cagr: Number(
      (((finalEquity / START_EQUITY) ** (1 / Math.max(years, 0.5)) - 1) * 100).toFixed(1),
    ),
  };

  return { metrics, equity, trades, matrix: buildMatrix(strategyKey, friction) };
}

export const MATRIX_RSI_PERIODS = [6, 8, 10, 12, 14, 16, 18, 21, 24, 28];
export const MATRIX_ATR_MULTIPLIERS = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];

export function buildMatrix(strategyKey: string, friction: Friction): MatrixCell[] {
  const rnd = mulberry(seedFrom(strategyKey + "matrix"));
  const cells: MatrixCell[] = [];
  for (const atrMultiplier of MATRIX_ATR_MULTIPLIERS) {
    for (const rsiPeriod of MATRIX_RSI_PERIODS) {
      // Smooth surface with a peak around rsi 14 / atr 1.5, then friction drag.
      const surface =
        1 - ((rsiPeriod - 14) / 16) ** 2 * 1.1 - ((atrMultiplier - 1.5) / 1.6) ** 2 * 1.2;
      const noise = (rnd() - 0.5) * 0.45;
      const drag = friction.commissionPerTrade * 0.06 + friction.slippageTicks * 0.09;
      const score = surface + noise - drag;
      cells.push({
        rsiPeriod,
        atrMultiplier,
        netProfit: Number((score * 9200).toFixed(0)),
        sharpe: Number((score * 2.1).toFixed(2)),
        trades: 280 + Math.floor(rnd() * 300),
      });
    }
  }
  return cells;
}

export const DATASETS = [
  { id: "mnq-1min-3y", label: "MNQ · 1-min bars · 2022–2025", tier: "free" as const },
  { id: "mnq-tick-3y", label: "MNQ · Tick data · 2022–2025", tier: "elite" as const },
  { id: "es-tick-5y", label: "ES · Tick data + L2 · 2020–2025", tier: "elite" as const },
];

export function formatCurrency(value: number): string {
  return `${value < 0 ? "−" : ""}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
