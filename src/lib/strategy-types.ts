import type { StrategyParams } from "./backtest-types";

export type StrategyParameter = {
  name: string;
  value: string | number;
  unit?: string;
  optimizable: boolean;
};

export type StrategyRule = { kind: "entry" | "exit" | "filter" | "risk"; text: string };

export type GeneratedStrategy = {
  id: string;
  prompt_original: string;
  ai_model_used: string;
  created_at: string;
  generated_logic: {
    name: string;
    instrument: string;
    instrumentId: string;
    timeframe: string;
    style: "Mean Reversion" | "Breakout / Momentum" | "Trend Following";
    thesis: string;
    rules: StrategyRule[];
    parameters: StrategyParameter[];
    indicators: string[];
    expected: { winRate: number; profitFactor: number; tradesPerWeek: number };
  };
};

export const GENERATION_STEPS = [
  "Cargando histórico real del instrumento...",
  "Analizando variables del prompt...",
  "Seleccionando indicadores y ventanas temporales...",
  "Generando árbol de decisión...",
  "Modelando gestión de riesgo y position sizing...",
  "Validando coherencia lógica de la estrategia...",
];

export const EXAMPLE_PROMPTS = [
  "Quiero una estrategia de reversión a la media en el Nasdaq, usando la media de sesión y confirmación de RSI sobrevendido, con un stop loss fijo de 20 ticks.",
  "Breakout de rango de apertura en el S&P 500 con filtro de volumen relativo y trailing stop por ATR.",
  "Momentum intradía en petróleo con cruce de EMAs, solo operar en la sesión de Nueva York.",
  "Reversión en Bitcoin en velas horarias con bandas de desviación y objetivo asimétrico 1:2.",
];

/** Maps the AI parameter list to the engine's typed parameters. */
export function paramsFromStrategy(
  strategy: GeneratedStrategy | null,
): Partial<StrategyParams> {
  const logic = strategy?.generated_logic;
  if (!logic) return {};
  const byName = new Map(logic.parameters.map((p) => [p.name, p.value] as const));
  const num = (name: string) => {
    const raw = byName.get(name);
    const parsed = typeof raw === "number" ? raw : Number(String(raw ?? "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : undefined;
  };
  return {
    style: logic.style,
    ...(num("rsi_period") !== undefined ? { rsiPeriod: num("rsi_period")! } : {}),
    ...(num("rsi_oversold") !== undefined ? { rsiOversold: num("rsi_oversold")! } : {}),
    ...(num("atr_multiplier") !== undefined ? { atrMultiplier: num("atr_multiplier")! } : {}),
    ...(num("stop_loss") !== undefined ? { stopTicks: num("stop_loss")! } : {}),
    ...(num("take_profit") !== undefined ? { takeTicks: num("take_profit")! } : {}),
    ...(num("max_trades_day") !== undefined ? { maxTradesDay: num("max_trades_day")! } : {}),
    ...(num("contracts") !== undefined ? { contracts: num("contracts")! } : {}),
  };
}
