/**
 * Mock LLM strategy generator.
 * Simulates the future `ai_generated_strategies` insert + Edge Function response
 * so the whole AI Studio UX is testable with no backend attached.
 */

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
    timeframe: string;
    style: string;
    thesis: string;
    rules: StrategyRule[];
    parameters: StrategyParameter[];
    indicators: string[];
    expected: { winRate: number; profitFactor: number; tradesPerWeek: number };
  };
};

export const GENERATION_STEPS = [
  "Analizando variables del prompt...",
  "Seleccionando indicadores y ventanas temporales...",
  "Generando árbol de decisión...",
  "Modelando gestión de riesgo y position sizing...",
  "Escribiendo parámetros para NinjaTrader...",
  "Validando coherencia lógica de la estrategia...",
];

export const EXAMPLE_PROMPTS = [
  "Quiero una estrategia de reversión a la media en el Nasdaq, usando el VWAP y confirmación de RSI sobrevendido, con un stop loss fijo de 20 ticks.",
  "Breakout de rango de apertura en ES con filtro de volumen relativo y trailing stop por ATR.",
  "Momentum intradía en CL con cruce de EMAs, solo operar en la sesión de Nueva York.",
  "Scalping de order flow en MNQ con delta divergence y objetivo de 8 ticks.",
];

const INSTRUMENTS: Array<[RegExp, string]> = [
  [/nasdaq|nq|mnq/i, "MNQ — Micro Nasdaq 100"],
  [/\bes\b|s&p|sp500/i, "ES — E-mini S&P 500"],
  [/\bcl\b|petrol|oil|crudo/i, "CL — Crude Oil"],
  [/oro|gold|\bgc\b/i, "GC — Gold Futures"],
  [/btc|bitcoin/i, "BTC — Bitcoin Perp"],
];

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length]!;
}

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

export function buildStrategyFromPrompt(prompt: string, model: string): GeneratedStrategy {
  const seed = hash(prompt);
  const instrument = INSTRUMENTS.find(([re]) => re.test(prompt))?.[1] ?? "MNQ — Micro Nasdaq 100";

  const mentionsVwap = /vwap/i.test(prompt);
  const mentionsRsi = /rsi/i.test(prompt);
  const mentionsAtr = /atr/i.test(prompt);
  const mentionsEma = /ema|media m[oó]vil|sma/i.test(prompt);
  const isBreakout = /breakout|ruptura|rango/i.test(prompt);
  const isReversion = /reversi[oó]n|mean reversion|sobrevendido|sobrecomprado/i.test(prompt);

  const style = isBreakout ? "Breakout / Momentum" : isReversion ? "Mean Reversion" : "Trend Following";

  const indicators = [
    mentionsVwap ? "VWAP de sesión" : "EMA(21)",
    mentionsRsi ? "RSI(14)" : "Stochastic(14,3)",
    mentionsAtr ? "ATR(14)" : "Volumen relativo (RVOL)",
    mentionsEma ? "EMA(9) / EMA(50)" : "Rango de apertura (30m)",
  ];

  const timeframe = pick(["1 min", "3 min", "5 min", "15 min"], seed);

  const rules: StrategyRule[] = [
    {
      kind: "filter",
      text: `Operar únicamente entre 09:35 y 15:45 ET, evitando los 5 minutos posteriores a la apertura en ${instrument.split(" — ")[0]}.`,
    },
    {
      kind: "entry",
      text: isBreakout
        ? `Entrada larga cuando el precio cierra por encima del máximo del rango de apertura con RVOL > 1.4 y ${indicators[0]} alineado al alza.`
        : `Entrada larga cuando el precio se extiende ≥ 1.2 desviaciones bajo ${indicators[0]} y ${indicators[1]} sale de zona de sobreventa (< 30 → cruce al alza).`,
    },
    {
      kind: "entry",
      text: `Espejo en corto con condiciones invertidas; máximo 1 posición abierta y 3 entradas por sesión.`,
    },
    {
      kind: "exit",
      text: isBreakout
        ? "Salida por trailing stop de 1.5 × ATR o cierre de sesión."
        : `Salida en el toque de ${indicators[0]} (target primario) o por tiempo tras 40 barras sin resolución.`,
    },
    {
      kind: "risk",
      text: `Stop loss fijo de 20 ticks desde la entrada; riesgo máximo por operación 0.75% del capital; corte diario a −2%.`,
    },
  ];

  const parameters: StrategyParameter[] = [
    { name: "rsi_period", value: 14, optimizable: true },
    { name: "rsi_oversold", value: 30, optimizable: true },
    { name: "atr_multiplier", value: 1.5, optimizable: true },
    { name: "stop_loss", value: 20, unit: "ticks", optimizable: true },
    { name: "take_profit", value: 46, unit: "ticks", optimizable: true },
    { name: "max_trades_day", value: 3, optimizable: false },
    { name: "session_filter", value: "09:35–15:45 ET", optimizable: false },
    { name: "contracts", value: 2, optimizable: false },
  ];

  return {
    id: `ai_${seed.toString(36)}_${Date.now().toString(36)}`,
    prompt_original: prompt,
    ai_model_used: model,
    created_at: new Date().toISOString(),
    generated_logic: {
      name: `${style === "Mean Reversion" ? "VWAP Reversion" : "Range Expansion"} — ${instrument.split(" — ")[0]}`,
      instrument,
      timeframe,
      style,
      thesis:
        style === "Mean Reversion"
          ? "La sobreextensión intradía respecto al precio medio ponderado por volumen tiende a corregirse cuando el momentum de corto plazo se agota. Se busca capturar el retorno al valor con riesgo acotado y objetivo asimétrico 1:2.3."
          : "La expansión de volatilidad tras un rango de acumulación tiende a continuar mientras el flujo institucional acompaña. Se persigue la continuación con stop estructural y gestión por volatilidad.",
      rules,
      parameters,
      indicators,
      expected: {
        winRate: 41 + (seed % 18),
        profitFactor: Number((1.25 + ((seed % 90) / 100)).toFixed(2)),
        tradesPerWeek: 6 + (seed % 14),
      },
    },
  };
}

export function mockGenerateStrategy(
  prompt: string,
  model = "quantforge-llm-v3 (mock)",
): Promise<GeneratedStrategy> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(buildStrategyFromPrompt(prompt, model)), 400);
  });
}
