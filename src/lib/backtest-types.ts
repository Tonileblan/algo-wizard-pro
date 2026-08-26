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

export type StrategyParams = {
  rsiPeriod: number;
  rsiOversold: number;
  atrMultiplier: number;
  stopTicks: number;
  takeTicks: number;
  maxTradesDay: number;
  contracts: number;
  style: "Mean Reversion" | "Breakout / Momentum" | "Trend Following";
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

export type MatrixCell = {
  rsiPeriod: number;
  atrMultiplier: number;
  netProfit: number;
  sharpe: number;
  trades: number;
};

export type BacktestResult = {
  metrics: BacktestMetrics;
  equity: EquityPoint[];
  trades: Trade[];
  matrix: MatrixCell[];
  /** Data provenance so the UI can show it is real market data. */
  dataset: {
    instrumentId: string;
    symbol: string;
    interval: string;
    source: string;
    bars: number;
    from: string;
    to: string;
  };
  backtestId?: string;
};

export const MATRIX_RSI_PERIODS = [6, 8, 10, 12, 14, 16, 18, 21, 24, 28];
export const MATRIX_ATR_MULTIPLIERS = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];

export const START_EQUITY = 25000;

export const DEFAULT_PARAMS: StrategyParams = {
  rsiPeriod: 14,
  rsiOversold: 30,
  atrMultiplier: 1.5,
  stopTicks: 20,
  takeTicks: 46,
  maxTradesDay: 3,
  contracts: 2,
  style: "Mean Reversion",
};

export function formatCurrency(value: number): string {
  return `${value < 0 ? "−" : ""}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
