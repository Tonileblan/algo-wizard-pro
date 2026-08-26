/**
 * Market data provider access (server only).
 *
 * Uses Twelve Data when TWELVE_DATA_API_KEY is configured, otherwise falls back
 * to the free Yahoo Finance chart endpoint so the app works out of the box.
 * Every series is cached in `market_candles` to stay inside provider rate limits
 * and to keep backtests reproducible.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Candle, CandleSeries, Quote } from "./market-types";

const TWELVE_INTERVAL: Record<string, string> = {
  "1m": "1min",
  "5m": "5min",
  "15m": "15min",
  "1h": "1h",
  "1d": "1day",
};

const RANGE_BARS: Record<string, number> = {
  "60d": 4000,
  "2y": 4000,
  "5y": 1300,
};

function cacheTtlMs(interval: string): number {
  return interval === "1d" ? 6 * 60 * 60 * 1000 : 15 * 60 * 1000;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function fetchYahooChart(symbol: string, interval: string, range: string) {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?interval=${interval}&range=${range}&includePrePost=false`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; QuantForge/1.0)", Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Yahoo Finance respondió ${res.status} para ${symbol}: ${await res.text()}`);
  }
  const json = (await res.json()) as {
    chart?: {
      error?: { description?: string } | null;
      result?: Array<{
        meta?: { regularMarketPrice?: number; chartPreviousClose?: number; previousClose?: number; currency?: string };
        timestamp?: number[];
        indicators?: { quote?: Array<Record<string, Array<number | null>>> };
      }>;
    };
  };
  if (json.chart?.error) {
    throw new Error(json.chart.error.description ?? `Símbolo no disponible: ${symbol}`);
  }
  const result = json.chart?.result?.[0];
  if (!result) throw new Error(`Sin datos de mercado para ${symbol}`);
  return result;
}

async function fetchCandlesFromYahoo(
  symbol: string,
  interval: string,
  range: string,
): Promise<Candle[]> {
  const result = await fetchYahooChart(symbol, interval, range);
  const quote = result.indicators?.quote?.[0];
  const stamps = result.timestamp ?? [];
  const candles: Candle[] = [];
  for (let i = 0; i < stamps.length; i++) {
    const open = num(quote?.["open"]?.[i]);
    const high = num(quote?.["high"]?.[i]);
    const low = num(quote?.["low"]?.[i]);
    const close = num(quote?.["close"]?.[i]);
    const stamp = stamps[i];
    if (open === null || high === null || low === null || close === null || stamp === undefined) continue;
    candles.push({
      ts: new Date(stamp * 1000).toISOString(),
      open,
      high,
      low,
      close,
      volume: num(quote?.["volume"]?.[i]) ?? 0,
    });
  }
  return candles;
}

async function fetchCandlesFromTwelveData(
  symbol: string,
  interval: string,
  range: string,
  apiKey: string,
): Promise<Candle[]> {
  const providerInterval = TWELVE_INTERVAL[interval] ?? "1day";
  const outputsize = RANGE_BARS[range] ?? 2000;
  const url =
    `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}` +
    `&interval=${providerInterval}&outputsize=${outputsize}&order=ASC&apikey=${apiKey}`;
  const res = await fetch(url);
  const json = (await res.json()) as {
    status?: string;
    message?: string;
    values?: Array<{ datetime: string; open: string; high: string; low: string; close: string; volume?: string }>;
  };
  if (!res.ok || json.status === "error" || !json.values) {
    throw new Error(json.message ?? `Twelve Data respondió ${res.status} para ${symbol}`);
  }
  return json.values.map((v) => ({
    ts: new Date(v.datetime.includes("T") ? v.datetime : `${v.datetime.replace(" ", "T")}Z`).toISOString(),
    open: Number(v.open),
    high: Number(v.high),
    low: Number(v.low),
    close: Number(v.close),
    volume: Number(v.volume ?? 0),
  }));
}

function providerName(): "twelve-data" | "yahoo-finance" {
  return process.env["TWELVE_DATA_API_KEY"] ? "twelve-data" : "yahoo-finance";
}

async function fetchFromProvider(symbol: string, interval: string, range: string): Promise<Candle[]> {
  const apiKey = process.env["TWELVE_DATA_API_KEY"];
  if (apiKey) {
    try {
      return await fetchCandlesFromTwelveData(symbol, interval, range, apiKey);
    } catch (error) {
      console.error("Twelve Data falló, usando el proveedor de respaldo:", error);
    }
  }
  return fetchCandlesFromYahoo(symbol, interval, range);
}

/** Cached candle series: DB first, provider on miss or stale cache. */
export async function loadCandleSeries(
  symbol: string,
  interval: string,
  range: string,
): Promise<CandleSeries> {
  const { data: freshest } = await supabaseAdmin
    .from("market_candles")
    .select("fetched_at, source")
    .eq("symbol", symbol)
    .eq("interval", interval)
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const fresh =
    freshest?.fetched_at !== undefined &&
    Date.now() - new Date(freshest.fetched_at).getTime() < cacheTtlMs(interval);

  if (fresh) {
    const cached = await readCachedCandles(symbol, interval);
    if (cached.length > 50) {
      return {
        symbol,
        interval,
        source: freshest?.source ?? "cache",
        cached: true,
        candles: cached,
      };
    }
  }

  const source = providerName();
  const candles = await fetchFromProvider(symbol, interval, range);
  if (candles.length === 0) throw new Error(`El proveedor no devolvió velas para ${symbol}`);

  const now = new Date().toISOString();
  const rows = candles.map((c) => ({
    symbol,
    interval,
    ts: c.ts,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
    source,
    fetched_at: now,
  }));

  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabaseAdmin
      .from("market_candles")
      .upsert(rows.slice(i, i + 500), { onConflict: "symbol,interval,ts" });
    if (error) console.error("No se pudo cachear las velas:", error.message);
  }

  return { symbol, interval, source, cached: false, candles };
}

async function readCachedCandles(symbol: string, interval: string): Promise<Candle[]> {
  const { data, error } = await supabaseAdmin
    .from("market_candles")
    .select("ts, open, high, low, close, volume")
    .eq("symbol", symbol)
    .eq("interval", interval)
    .order("ts", { ascending: true })
    .limit(5000);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    ts: new Date(r.ts).toISOString(),
    open: r.open,
    high: r.high,
    low: r.low,
    close: r.close,
    volume: r.volume,
  }));
}

export async function loadQuotes(symbols: string[]): Promise<Quote[]> {
  const results = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const result = await fetchYahooChart(symbol, "5m", "1d");
        const closes = (result.indicators?.quote?.[0]?.["close"] ?? []).filter(
          (v): v is number => typeof v === "number" && Number.isFinite(v),
        );
        const price = num(result.meta?.regularMarketPrice) ?? closes.at(-1) ?? 0;
        const previousClose =
          num(result.meta?.chartPreviousClose) ?? num(result.meta?.previousClose) ?? price;
        const change = price - previousClose;
        return {
          symbol,
          price,
          previousClose,
          change,
          changePct: previousClose ? (change / previousClose) * 100 : 0,
          currency: result.meta?.currency ?? "USD",
          asOf: new Date().toISOString(),
        } satisfies Quote;
      } catch (error) {
        console.error(`Cotización no disponible para ${symbol}:`, error);
        return null;
      }
    }),
  );
  return results.filter((q): q is Quote => q !== null);
}
