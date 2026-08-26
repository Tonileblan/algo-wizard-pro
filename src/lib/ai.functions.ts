import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { INSTRUMENTS } from "./market-symbols";
import { getPlan, type PlanTier } from "./plans";
import type { GeneratedStrategy } from "./strategy-types";

const MODEL = "google/gemini-3.7-flash";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "name",
    "instrumentId",
    "timeframe",
    "style",
    "thesis",
    "rules",
    "parameters",
    "indicators",
    "expected",
  ],
  properties: {
    name: { type: "string" },
    instrumentId: { type: "string", enum: INSTRUMENTS.map((i) => i.id) },
    timeframe: { type: "string" },
    style: { type: "string", enum: ["Mean Reversion", "Breakout / Momentum", "Trend Following"] },
    thesis: { type: "string" },
    rules: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "text"],
        properties: {
          kind: { type: "string", enum: ["entry", "exit", "filter", "risk"] },
          text: { type: "string" },
        },
      },
    },
    parameters: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "value", "unit", "optimizable"],
        properties: {
          name: {
            type: "string",
            enum: [
              "rsi_period",
              "rsi_oversold",
              "atr_multiplier",
              "stop_loss",
              "take_profit",
              "max_trades_day",
              "contracts",
              "session_filter",
            ],
          },
          value: { type: "string" },
          unit: { type: ["string", "null"] },
          optimizable: { type: "boolean" },
        },
      },
    },
    indicators: { type: "array", items: { type: "string" } },
    expected: {
      type: "object",
      additionalProperties: false,
      required: ["winRate", "profitFactor", "tradesPerWeek"],
      properties: {
        winRate: { type: "number" },
        profitFactor: { type: "number" },
        tradesPerWeek: { type: "number" },
      },
    },
  },
} as const;

const SYSTEM_PROMPT = `Eres un quant senior que traduce ideas de trading en lógica ejecutable.
Devuelves SIEMPRE la estrategia con el esquema JSON solicitado, en español.
El motor de backtest solo entiende estos parámetros numéricos: rsi_period, rsi_oversold,
atr_multiplier, stop_loss (ticks), take_profit (ticks), max_trades_day, contracts.
Elige instrumentId entre los datasets reales disponibles, respetando el instrumento pedido.
Las reglas deben ser concretas y coherentes con los parámetros y el estilo elegido.`;

function instrumentContext(): string {
  return INSTRUMENTS.map((i) => `${i.id}: ${i.label} (${i.description})`).join("\n");
}

export const generateStrategy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { prompt: string }) => {
    const prompt = (input?.prompt ?? "").trim();
    if (prompt.length < 12) throw new Error("Describe tu estrategia con algo más de detalle.");
    return { prompt: prompt.slice(0, 2000) };
  })
  .handler(async ({ data, context }): Promise<GeneratedStrategy> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("La IA no está configurada en este proyecto (falta LOVABLE_API_KEY).");

    const { data: sub, error: subError } = await context.supabase
      .from("subscriptions")
      .select("plan_tier, ai_generations_used")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (subError) throw new Error(subError.message);

    const plan = getPlan((sub?.plan_tier ?? "free") as PlanTier);
    if (plan.aiGenerationsPerMonth !== "unlimited") {
      if (plan.aiGenerationsPerMonth === 0) {
        throw new Error("El AI Strategy Studio requiere el plan Pro.");
      }
      if ((sub?.ai_generations_used ?? 0) >= plan.aiGenerationsPerMonth) {
        throw new Error("Has agotado tus generaciones de IA de este mes.");
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Datasets reales disponibles:\n${instrumentContext()}\n\nIdea del trader:\n${data.prompt}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "trading_strategy", strict: true, schema: SCHEMA },
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`AI gateway error [${response.status}]: ${body}`);
      if (response.status === 402) {
        throw new Error("Se han agotado los créditos de IA del workspace. Recárgalos para seguir generando.");
      }
      if (response.status === 429) {
        throw new Error("Demasiadas peticiones a la IA. Inténtalo de nuevo en unos segundos.");
      }
      throw new Error(`La IA devolvió un error [${response.status}]: ${body.slice(0, 300)}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = payload.choices?.[0]?.message?.content;
    if (!raw) throw new Error("La IA no devolvió ninguna estrategia. Reformula el prompt.");

    let logic: GeneratedStrategy["generated_logic"];
    try {
      const parsed = JSON.parse(raw) as Omit<GeneratedStrategy["generated_logic"], "instrument">;
      const instrument = INSTRUMENTS.find((i) => i.id === parsed.instrumentId) ?? INSTRUMENTS[0]!;
      logic = { ...parsed, instrument: instrument.label, instrumentId: instrument.id };
    } catch (error) {
      console.error("Respuesta de IA no parseable:", error, raw.slice(0, 500));
      throw new Error("La IA devolvió una estrategia con formato inválido. Vuelve a intentarlo.");
    }

    const { data: inserted, error } = await context.supabase
      .from("ai_generated_strategies")
      .insert({
        user_id: context.userId,
        prompt_original: data.prompt,
        ai_model_used: MODEL,
        generated_logic: logic as unknown as Record<string, unknown>,
      })
      .select("id, created_at")
      .maybeSingle();
    if (error) throw new Error(error.message);

    await context.supabase
      .from("subscriptions")
      .update({ ai_generations_used: (sub?.ai_generations_used ?? 0) + 1 })
      .eq("user_id", context.userId);

    return {
      id: inserted?.id ?? crypto.randomUUID(),
      prompt_original: data.prompt,
      ai_model_used: MODEL,
      created_at: inserted?.created_at ?? new Date().toISOString(),
      generated_logic: logic,
    };
  });
