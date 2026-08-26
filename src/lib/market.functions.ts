import { createServerFn } from "@tanstack/react-start";
import type { CandleSeries, Quote } from "./market-types";

/** Public read-only market data (cached candles + latest prices). */
export const getCandles = createServerFn({ method: "POST" })
  .inputValidator((input: { symbol: string; interval: string; range: string }) => {
    if (!input?.symbol || !input.interval || !input.range) throw new Error("Parámetros de mercado incompletos");
    return input;
  })
  .handler(async ({ data }): Promise<CandleSeries> => {
    const { loadCandleSeries } = await import("./market.server");
    return loadCandleSeries(data.symbol, data.interval, data.range);
  });

export const getQuotes = createServerFn({ method: "POST" })
  .inputValidator((input: { symbols: string[] }) => ({
    symbols: (input?.symbols ?? []).slice(0, 12).filter((s) => typeof s === "string" && s.length > 0),
  }))
  .handler(async ({ data }): Promise<Quote[]> => {
    if (data.symbols.length === 0) return [];
    const { loadQuotes } = await import("./market.server");
    return loadQuotes(data.symbols);
  });
