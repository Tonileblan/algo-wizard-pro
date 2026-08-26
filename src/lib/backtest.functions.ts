import { createServerFn } from "@tanstack/react-start";
import type { Json } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getInstrument } from "./market-symbols";
import { DEFAULT_PARAMS, type BacktestResult, type Friction, type StrategyParams } from "./backtest-types";

type RunInput = {
  instrumentId: string;
  friction: Friction;
  params?: Partial<StrategyParams>;
  strategyId?: string | null;
  withMatrix?: boolean;
  persist?: boolean;
};

function validate(input: RunInput): RunInput {
  if (!input?.instrumentId) throw new Error("Falta el instrumento del backtest");
  const f = input.friction;
  return {
    instrumentId: input.instrumentId,
    friction: {
      commissionPerTrade: Number(f?.commissionPerTrade ?? 0),
      slippageTicks: Number(f?.slippageTicks ?? 0),
      latencyMs: Number(f?.latencyMs ?? 0),
    },
    params: input.params ?? {},
    strategyId: input.strategyId ?? null,
    withMatrix: Boolean(input.withMatrix),
    persist: input.persist !== false,
  };
}

/** Runs the strategy over real market candles and stores the result. */
export const runBacktest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validate)
  .handler(async ({ data, context }): Promise<BacktestResult> => {
    const instrument = getInstrument(data.instrumentId);
    const params: StrategyParams = { ...DEFAULT_PARAMS, ...data.params };

    const { loadCandleSeries } = await import("./market.server");
    const { runBacktestOnCandles, buildMatrix } = await import("./backtest-engine.server");

    const series = await loadCandleSeries(instrument.symbol, instrument.interval, instrument.range);
    if (series.candles.length < 120) {
      throw new Error(`Histórico insuficiente para ${instrument.symbol} (${series.candles.length} velas)`);
    }

    const run = runBacktestOnCandles(series.candles, params, data.friction, instrument);
    const matrix = data.withMatrix
      ? buildMatrix(series.candles, params, data.friction, instrument)
      : [];

    const dataset = {
      instrumentId: instrument.id,
      symbol: instrument.symbol,
      interval: instrument.interval,
      source: series.source,
      bars: series.candles.length,
      from: series.candles[0]!.ts,
      to: series.candles.at(-1)!.ts,
    };

    let backtestId: string | undefined;
    if (data.persist) {
      const { data: inserted, error } = await context.supabase
        .from("advanced_backtests")
        .insert({
          user_id: context.userId,
          strategy_id: data.strategyId,
          symbol: instrument.symbol,
          interval: instrument.interval,
          parameters: params as unknown as Json,
          friction: data.friction as unknown as Json,
          metrics: run.metrics as unknown as Json,
          equity_curve: run.equity as unknown as Json,
          trade_log: run.trades.slice(0, 1000) as unknown as Json,
        })
        .select("id")
        .maybeSingle();
      if (error) console.error("No se pudo guardar el backtest:", error.message);
      backtestId = inserted?.id;
    }

    return { ...run, matrix, dataset, ...(backtestId ? { backtestId } : {}) };
  });
