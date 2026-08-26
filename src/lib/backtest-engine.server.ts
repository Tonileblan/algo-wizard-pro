/**
 * Real bar-by-bar backtest engine (server only).
 *
 * Runs the strategy rules over real market candles, applying the friction model
 * (commission, slippage in ticks, latency-derived extra slippage) and producing
 * the same result shape the analyzer UI already consumes.
 */

import { atr, ema, rollingStd, rsi } from "./indicators";
import type { Candle } from "./market-types";
import type { Instrument } from "./market-symbols";
import {
  MATRIX_ATR_MULTIPLIERS,
  MATRIX_RSI_PERIODS,
  START_EQUITY,
  type BacktestMetrics,
  type EquityPoint,
  type Friction,
  type MatrixCell,
  type StrategyParams,
  type Trade,
} from "./backtest-types";

type Run = {
  trades: Trade[];
  equity: EquityPoint[];
  metrics: BacktestMetrics;
};

function durationLabel(fromIso: string, toIso: string): string {
  const minutes = Math.max(1, Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 60000));
  if (minutes < 90) return `${minutes}m`;
  const hours = minutes / 60;
  if (hours < 30) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export function runBacktestOnCandles(
  candles: Candle[],
  params: StrategyParams,
  friction: Friction,
  instrument: Instrument,
): Run {
  const closes = candles.map((c) => c.close);
  const rsiSeries = rsi(closes, Math.max(2, Math.round(params.rsiPeriod)));
  const emaFast = ema(closes, 9);
  const emaSlow = ema(closes, 50);
  const anchor = ema(closes, 21);
  const std = rollingStd(closes, 21);
  const atrSeries = atr(candles, 14);

  const { tickSize, tickValue } = instrument;
  const qty = Math.max(1, Math.round(params.contracts));
  // Latency degrades the fill: every 100 ms adds a quarter tick of slippage.
  const slipTicks = params.stopTicks > 0 ? friction.slippageTicks + friction.latencyMs / 400 : 0;
  const slip = slipTicks * tickSize;

  const trades: Trade[] = [];
  const equity: EquityPoint[] = [];
  const returns: number[] = [];

  let cumulative = 0;
  let peak = START_EQUITY;
  let maxDd = 0;
  let maxDdPct = 0;
  let wins = 0;
  let grossWin = 0;
  let grossLoss = 0;
  let consecutive = 0;
  let maxConsecutive = 0;

  let position: {
    side: "LONG" | "SHORT";
    entry: number;
    stop: number;
    target: number;
    openedAt: string;
  } | null = null;
  let tradesToday = 0;
  let currentDay = "";

  for (let i = 60; i < candles.length; i++) {
    const bar = candles[i]!;
    const day = bar.ts.slice(0, 10);
    if (day !== currentDay) {
      currentDay = day;
      tradesToday = 0;
    }

    if (position) {
      const long = position.side === "LONG";
      const hitStop = long ? bar.low <= position.stop : bar.high >= position.stop;
      const hitTarget = long ? bar.high >= position.target : bar.low <= position.target;
      const lastBar = i === candles.length - 1;
      let exit: number | null = null;
      // Conservative resolution: when both levels trade in the same bar, take the stop.
      if (hitStop) exit = position.stop;
      else if (hitTarget) exit = position.target;
      else if (lastBar) exit = bar.close;

      if (exit !== null) {
        const fill = long ? exit - slip : exit + slip;
        const rawTicks = ((long ? fill - position.entry : position.entry - fill) / tickSize);
        const ticks = Math.round(rawTicks);
        const pnl = Number((ticks * tickValue * qty - friction.commissionPerTrade * qty).toFixed(2));
        cumulative = Number((cumulative + pnl).toFixed(2));

        if (pnl > 0) {
          wins++;
          grossWin += pnl;
          consecutive = 0;
        } else {
          grossLoss += Math.abs(pnl);
          consecutive++;
          maxConsecutive = Math.max(maxConsecutive, consecutive);
        }

        trades.push({
          id: trades.length + 1,
          date: position.openedAt,
          side: position.side,
          entry: Number(position.entry.toFixed(2)),
          exit: Number(fill.toFixed(2)),
          qty,
          ticks,
          pnl,
          cumulative,
          duration: durationLabel(position.openedAt, bar.ts),
        });

        const eq = START_EQUITY + cumulative;
        peak = Math.max(peak, eq);
        const dd = eq - peak;
        maxDd = Math.min(maxDd, dd);
        maxDdPct = Math.min(maxDdPct, (dd / peak) * 100);
        returns.push(pnl / START_EQUITY);
        equity.push({
          date: bar.ts.slice(0, 10),
          equity: Number(eq.toFixed(2)),
          drawdown: Number(((dd / peak) * 100).toFixed(2)),
        });

        position = null;
      }
      continue;
    }

    if (tradesToday >= Math.max(1, params.maxTradesDay)) continue;

    const r = rsiSeries[i];
    const a = atrSeries[i];
    const mean = anchor[i];
    const dev = std[i];
    const fast = emaFast[i];
    const slow = emaSlow[i];
    if (r === null || a === null || a === undefined || mean === null || dev === null) continue;

    let side: "LONG" | "SHORT" | null = null;

    if (params.style === "Mean Reversion") {
      const lowerBand = mean! - 1.2 * dev!;
      const upperBand = mean! + 1.2 * dev!;
      const prevRsi = rsiSeries[i - 1];
      if (bar.close < lowerBand && r > params.rsiOversold && (prevRsi ?? 100) <= params.rsiOversold) side = "LONG";
      else if (bar.close > upperBand && r < 100 - params.rsiOversold && (prevRsi ?? 0) >= 100 - params.rsiOversold)
        side = "SHORT";
    } else if (params.style === "Breakout / Momentum") {
      const window = candles.slice(Math.max(0, i - 20), i);
      const hi = Math.max(...window.map((c) => c.high));
      const lo = Math.min(...window.map((c) => c.low));
      const avgVol = window.reduce((s, c) => s + c.volume, 0) / Math.max(window.length, 1);
      const rvol = avgVol > 0 ? bar.volume / avgVol : 1;
      if (bar.close > hi && rvol > 1.2) side = "LONG";
      else if (bar.close < lo && rvol > 1.2) side = "SHORT";
    } else {
      if (fast !== null && slow !== null && fast! > slow! && (emaFast[i - 1] ?? 0) <= (emaSlow[i - 1] ?? 0))
        side = "LONG";
      else if (fast !== null && slow !== null && fast! < slow! && (emaFast[i - 1] ?? 0) >= (emaSlow[i - 1] ?? 0))
        side = "SHORT";
    }

    if (!side) continue;

    const entryFill = side === "LONG" ? bar.close + slip : bar.close - slip;
    const stopDistance = Math.max(params.stopTicks * tickSize, a! * params.atrMultiplier * 0.35);
    const targetDistance = Math.max(params.takeTicks * tickSize, stopDistance * 1.8);

    position = {
      side,
      entry: entryFill,
      stop: side === "LONG" ? entryFill - stopDistance : entryFill + stopDistance,
      target: side === "LONG" ? entryFill + targetDistance : entryFill - targetDistance,
      openedAt: bar.ts,
    };
    tradesToday++;
  }

  const total = trades.length;
  const mean = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const sd = returns.length
    ? Math.sqrt(returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length)
    : 0;
  const downside = returns.filter((r) => r < 0);
  const dsd = downside.length
    ? Math.sqrt(downside.reduce((a, b) => a + b * b, 0) / downside.length)
    : 0;

  const firstTs = candles[60]?.ts ?? candles[0]?.ts ?? new Date().toISOString();
  const lastTs = candles.at(-1)?.ts ?? firstTs;
  const years = Math.max((Date.parse(lastTs) - Date.parse(firstTs)) / (365 * 24 * 3600 * 1000), 0.25);
  const tradesPerYear = total / years;
  const annualize = Math.sqrt(Math.max(tradesPerYear, 1));
  const finalEquity = START_EQUITY + cumulative;

  const metrics: BacktestMetrics = {
    netProfit: Number(cumulative.toFixed(2)),
    totalTrades: total,
    winRate: Number(((wins / Math.max(total, 1)) * 100).toFixed(1)),
    profitFactor: Number((grossWin / Math.max(grossLoss, 1)).toFixed(2)),
    sharpe: Number(((mean / (sd || 1)) * annualize).toFixed(2)),
    sortino: Number(((mean / (dsd || 1)) * annualize).toFixed(2)),
    maxDrawdown: Number(maxDd.toFixed(2)),
    maxDrawdownPct: Number(maxDdPct.toFixed(2)),
    maxConsecutiveLosses: maxConsecutive,
    avgWin: Number((grossWin / Math.max(wins, 1)).toFixed(2)),
    avgLoss: Number((grossLoss / Math.max(total - wins, 1)).toFixed(2)),
    expectancy: Number((cumulative / Math.max(total, 1)).toFixed(2)),
    cagr: Number(
      ((Math.max(finalEquity, 1) / START_EQUITY) ** (1 / years) * 100 - 100).toFixed(1),
    ),
  };

  return { trades, equity, metrics };
}

export function buildMatrix(
  candles: Candle[],
  params: StrategyParams,
  friction: Friction,
  instrument: Instrument,
): MatrixCell[] {
  const cells: MatrixCell[] = [];
  for (const atrMultiplier of MATRIX_ATR_MULTIPLIERS) {
    for (const rsiPeriod of MATRIX_RSI_PERIODS) {
      const run = runBacktestOnCandles(
        candles,
        { ...params, rsiPeriod, atrMultiplier },
        friction,
        instrument,
      );
      cells.push({
        rsiPeriod,
        atrMultiplier,
        netProfit: run.metrics.netProfit,
        sharpe: run.metrics.sharpe,
        trades: run.metrics.totalTrades,
      });
    }
  }
  return cells;
}
