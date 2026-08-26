/**
 * Instrument catalog.
 *
 * Real CME futures feeds require a paid professional subscription, so every
 * futures contract is mapped to a liquid, freely quotable proxy with the same
 * underlying (MNQ -> QQQ, ES -> SPY, CL -> USO, GC -> GLD, BTC -> BTC-USD).
 */

export type PlanTierId = "free" | "pro" | "elite";

export type Instrument = {
  id: string;
  /** Contract-style label shown in the UI. */
  label: string;
  /** Symbol sent to the market-data provider. */
  symbol: string;
  interval: string;
  /** How much history to request. */
  range: string;
  tickSize: number;
  tickValue: number;
  tier: PlanTierId;
  description: string;
};

export const INSTRUMENTS: Instrument[] = [
  {
    id: "mnq-1d",
    label: "MNQ · Nasdaq 100 (QQQ) · barras diarias · 5 años",
    symbol: "QQQ",
    interval: "1d",
    range: "5y",
    tickSize: 0.01,
    tickValue: 1,
    tier: "free",
    description: "Nasdaq 100 en barras diarias",
  },
  {
    id: "mnq-1h",
    label: "MNQ · Nasdaq 100 (QQQ) · 1 hora · 2 años",
    symbol: "QQQ",
    interval: "1h",
    range: "2y",
    tickSize: 0.01,
    tickValue: 1,
    tier: "pro",
    description: "Nasdaq 100 intradía horario",
  },
  {
    id: "es-5m",
    label: "ES · S&P 500 (SPY) · 5 min · 60 días",
    symbol: "SPY",
    interval: "5m",
    range: "60d",
    tickSize: 0.01,
    tickValue: 1,
    tier: "pro",
    description: "S&P 500 intradía de 5 minutos",
  },
  {
    id: "cl-1h",
    label: "CL · Crude Oil (USO) · 1 hora · 2 años",
    symbol: "USO",
    interval: "1h",
    range: "2y",
    tickSize: 0.01,
    tickValue: 1,
    tier: "elite",
    description: "Petróleo intradía horario",
  },
  {
    id: "btc-1h",
    label: "BTC · Bitcoin (BTC-USD) · 1 hora · 2 años",
    symbol: "BTC-USD",
    interval: "1h",
    range: "2y",
    tickSize: 1,
    tickValue: 0.01,
    tier: "elite",
    description: "Bitcoin spot intradía horario",
  },
];

export function getInstrument(id: string): Instrument {
  return INSTRUMENTS.find((i) => i.id === id) ?? INSTRUMENTS[0]!;
}

/** Symbols shown in the live market panel. */
export const WATCHLIST = [
  { symbol: "QQQ", label: "MNQ · Nasdaq 100" },
  { symbol: "SPY", label: "ES · S&P 500" },
  { symbol: "USO", label: "CL · Crude Oil" },
  { symbol: "GLD", label: "GC · Gold" },
  { symbol: "BTC-USD", label: "BTC · Bitcoin" },
] as const;
