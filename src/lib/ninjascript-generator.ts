import type { GeneratedStrategy } from "@/lib/strategy-types";

export type NinjaScriptOptions = {
  strategyName?: string;
  instrument?: string;
  timeframe?: string;
  style?: "Mean Reversion" | "Breakout / Momentum" | "Trend Following" | string;
  thesis?: string;
  rules?: Array<{ kind: string; text: string }>;
  contracts?: number;
  rsiPeriod?: number;
  rsiOversold?: number;
  rsiOverbought?: number;
  stopTicks?: number;
  takeTicks?: number;
  atrMultiplier?: number;
  emaFast?: number;
  emaSlow?: number;
  customNotes?: string;
};

/**
 * Sanitizes a string into a valid C# identifier suitable for NinjaTrader class names.
 */
export function sanitizeCSharpIdentifier(raw: string): string {
  const cleaned = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

  if (!cleaned || /^[0-9]/.test(cleaned)) {
    return `Quantitrading_${cleaned || "Strategy"}`;
  }
  return `Quantitrading_${cleaned}`;
}

/**
 * Converts a GeneratedStrategy or custom parameters into a complete NinjaScript 8 C# Strategy file.
 */
export function generateNinjaScriptCode(
  input: GeneratedStrategy | NinjaScriptOptions,
): { className: string; fileName: string; code: string } {
  let name = "Custom_Strategy";
  let instrument = "NQ (E-mini Nasdaq 100)";
  let timeframe = "5 min";
  let style = "Mean Reversion";
  let thesis = "Estrategia algorítmica generada por Quantitrading.";
  let rules: Array<{ kind: string; text: string }> = [];
  let contracts = 1;
  let rsiPeriod = 14;
  let rsiOversold = 30;
  let rsiOverbought = 70;
  let stopTicks = 20;
  let takeTicks = 40;
  let atrMultiplier = 1.5;
  let emaFast = 9;
  let emaSlow = 21;

  if ("generated_logic" in input) {
    const logic = input.generated_logic;
    name = logic.name || name;
    instrument = logic.instrument || instrument;
    timeframe = logic.timeframe || timeframe;
    style = logic.style || style;
    thesis = logic.thesis || input.prompt_original || thesis;
    rules = logic.rules || [];

    for (const p of logic.parameters || []) {
      const numVal =
        typeof p.value === "number"
          ? p.value
          : Number(String(p.value).replace(/[^\d.-]/g, ""));
      if (Number.isFinite(numVal)) {
        if (p.name.includes("rsi_period") || p.name === "period") rsiPeriod = numVal;
        if (p.name.includes("oversold")) rsiOversold = numVal;
        if (p.name.includes("overbought")) rsiOverbought = numVal;
        if (p.name.includes("stop") || p.name.includes("stop_loss")) stopTicks = numVal;
        if (p.name.includes("take") || p.name.includes("take_profit") || p.name.includes("target")) takeTicks = numVal;
        if (p.name.includes("atr")) atrMultiplier = numVal;
        if (p.name.includes("ema_fast") || p.name.includes("fast")) emaFast = numVal;
        if (p.name.includes("ema_slow") || p.name.includes("slow")) emaSlow = numVal;
        if (p.name.includes("contracts") || p.name.includes("quantity")) contracts = Math.max(1, Math.round(numVal));
      }
    }
  } else {
    name = input.strategyName || name;
    instrument = input.instrument || instrument;
    timeframe = input.timeframe || timeframe;
    style = input.style || style;
    thesis = input.thesis || thesis;
    rules = input.rules || [];
    if (input.contracts) contracts = input.contracts;
    if (input.rsiPeriod) rsiPeriod = input.rsiPeriod;
    if (input.rsiOversold) rsiOversold = input.rsiOversold;
    if (input.rsiOverbought) rsiOverbought = input.rsiOverbought;
    if (input.stopTicks) stopTicks = input.stopTicks;
    if (input.takeTicks) takeTicks = input.takeTicks;
    if (input.atrMultiplier) atrMultiplier = input.atrMultiplier;
    if (input.emaFast) emaFast = input.emaFast;
    if (input.emaSlow) emaSlow = input.emaSlow;
  }

  const className = sanitizeCSharpIdentifier(name);
  const fileName = `${className}.cs`;
  const formattedDate = new Date().toISOString().split("T")[0];

  const rulesComment = rules.length > 0
    ? rules.map((r) => ` *   [${r.kind.toUpperCase()}] ${r.text}`).join("\n")
    : " *   Reglas paramétricas configuradas según indicadores técnicos.";

  const isBreakout = style.toLowerCase().includes("breakout") || style.toLowerCase().includes("momentum");
  const isTrend = style.toLowerCase().includes("trend");

  let logicCode = "";
  if (isBreakout) {
    logicCode = `            // === Lógica Breakout & Momentum ===
            double highestHigh = MAX(High, 20)[1];
            double lowestLow = MIN(Low, 20)[1];

            // Entrada Long por ruptura de máximos con confirmación de EMA
            if (Position.MarketPosition == MarketPosition.Flat && Close[0] > highestHigh && Close[0] > emaFast[0])
            {
                EnterLong(Quantity, "Long_Breakout");
            }
            // Entrada Short por ruptura de mínimos
            else if (Position.MarketPosition == MarketPosition.Flat && Close[0] < lowestLow && Close[0] < emaFast[0])
            {
                EnterShort(Quantity, "Short_Breakout");
            }`;
  } else if (isTrend) {
    logicCode = `            // === Lógica Trend Following ===
            // Cruce alcista de medias móviles con filtro RSI
            if (Position.MarketPosition == MarketPosition.Flat && CrossAbove(emaFast, emaSlow, 1) && rsi[0] > 50)
            {
                EnterLong(Quantity, "Long_TrendCross");
            }
            // Cruce bajista de medias móviles con filtro RSI
            else if (Position.MarketPosition == MarketPosition.Flat && CrossBelow(emaFast, emaSlow, 1) && rsi[0] < 50)
            {
                EnterShort(Quantity, "Short_TrendCross");
            }
            // Salida por reversión de medias
            else if (Position.MarketPosition == MarketPosition.Long && CrossBelow(emaFast, emaSlow, 1))
            {
                ExitLong("Exit_TrendReversal", "Long_TrendCross");
            }
            else if (Position.MarketPosition == MarketPosition.Short && CrossAbove(emaFast, emaSlow, 1))
            {
                ExitShort("Exit_TrendReversal", "Short_TrendCross");
            }`;
  } else {
    // Mean Reversion por defecto
    logicCode = `            // === Lógica Mean Reversion ===
            // Condición Long: RSI sobrevendido y giro del precio sobre la media
            if (Position.MarketPosition == MarketPosition.Flat && rsi[0] <= RsiOversold && Close[0] > Open[0])
            {
                EnterLong(Quantity, "Long_MeanRev");
            }
            // Condición Short: RSI sobrecomprado y vela de rechazo
            else if (Position.MarketPosition == MarketPosition.Flat && rsi[0] >= RsiOverbought && Close[0] < Open[0])
            {
                EnterShort(Quantity, "Short_MeanRev");
            }
            // Salida de equilibrio (RSI vuelve a nivel neutral 50)
            else if (Position.MarketPosition == MarketPosition.Long && rsi[0] >= 50)
            {
                ExitLong("Exit_Neutral", "Long_MeanRev");
            }
            else if (Position.MarketPosition == MarketPosition.Short && rsi[0] <= 50)
            {
                ExitShort("Exit_Neutral", "Short_MeanRev");
            }`;
  }

  const code = `#region Using declarations
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Input;
using System.Windows.Media;
using System.Xml.Serialization;
using NinjaTrader.Cbi;
using NinjaTrader.Gui;
using NinjaTrader.Gui.Chart;
using NinjaTrader.Gui.SuperDom;
using NinjaTrader.Gui.Tools;
using NinjaTrader.Data;
using NinjaTrader.NinjaScript;
using NinjaTrader.Core.FloatingPoint;
using NinjaTrader.NinjaScript.Indicators;
using NinjaTrader.NinjaScript.DrawingTools;
#endregion

// ==========================================================================================
// ESTRATEGIA GENERADA POR QUANTITRADING
// ==========================================================================================
// Nombre: ${name}
// Instrumento sugerido: ${instrument}
// Timeframe: ${timeframe}
// Estilo: ${style}
// Fecha de generación: ${formattedDate}
// 
// Hipótesis / Tesis:
// ${thesis}
// 
// Reglas operativas:
${rulesComment}
// 
// Instrucciones de instalación:
// 1. Copia este archivo a tu carpeta: Documentos\\NinjaTrader 8\\bin\\Custom\\Strategies\\
// 2. En NinjaTrader 8: Tools -> NinjaScript Editor -> Pulsa F5 para compilar.
// 3. Abre un gráfico de ${instrument} (${timeframe}) -> Clic derecho -> Strategies -> Selecciona ${className}.
// ==========================================================================================

namespace NinjaTrader.NinjaScript.Strategies
{
    public class ${className} : Strategy
    {
        private RSI rsi;
        private ATR atr;
        private EMA emaFast;
        private EMA emaSlow;

        protected override void OnStateChange()
        {
            if (State == State.SetDefaults)
            {
                Description                                 = @"Estrategia generada por Quantitrading: ${name}";
                Name                                        = "${className}";
                Calculate                                   = Calculate.OnBarClose;
                EntriesPerDirection                         = 1;
                EntryHandling                               = EntryHandling.AllEntries;
                IsExitOnSessionCloseStrategy                = true;
                ExitOnSessionCloseSeconds                   = 30;
                IsFillLimitOnTouch                          = false;
                MaximumBarsLookBack                         = MaximumBarsLookBack.TwoHundredFiftySix;
                OrderFillResolution                         = OrderFillResolution.Standard;
                Slippage                                    = 1;
                StartBehavior                               = StartBehavior.WaitUntilFlat;
                TimeInForce                                 = TimeInForce.Gtc;
                TraceOrders                                 = false;
                RealtimeErrorHandling                       = RealtimeErrorHandling.StopCancelClose;
                StopTargetHandling                          = StopTargetHandling.PerEntryExecution;
                BarsRequiredToTrade                         = 20;
                IncludeCommission                           = true;

                // --- Parámetros por defecto ---
                Quantity                                    = ${contracts};
                RsiPeriod                                   = ${rsiPeriod};
                RsiOversold                                 = ${rsiOversold};
                RsiOverbought                               = ${rsiOverbought};
                AtrPeriod                                   = 14;
                AtrMultiplier                               = ${atrMultiplier.toFixed(2)};
                StopLossTicks                               = ${stopTicks};
                TakeProfitTicks                             = ${takeTicks};
                EmaFastPeriod                               = ${emaFast};
                EmaSlowPeriod                               = ${emaSlow};
            }
            else if (State == State.Configure)
            {
                // Configurar Stop Loss y Take Profit fijos
                if (StopLossTicks > 0)
                {
                    SetStopLoss(CalculationMode.Ticks, StopLossTicks);
                }

                if (TakeProfitTicks > 0)
                {
                    SetProfitTarget(CalculationMode.Ticks, TakeProfitTicks);
                }
            }
            else if (State == State.DataLoaded)
            {
                // Inicializar Indicadores Técnicos
                rsi = RSI(RsiPeriod, 3);
                atr = ATR(AtrPeriod);
                emaFast = EMA(EmaFastPeriod);
                emaSlow = EMA(EmaSlowPeriod);

                // Añadir gráficos de los indicadores en el chart
                AddChartIndicator(rsi);
                AddChartIndicator(emaFast);
                AddChartIndicator(emaSlow);
            }
        }

        protected override void OnBarUpdate()
        {
            if (CurrentBar < BarsRequiredToTrade)
                return;

${logicCode}
        }

        #region Properties
        [NinjaScriptProperty]
        [Range(1, int.MaxValue)]
        [Display(Name="Quantity (Contratos)", Description="Número de contratos u ordenes base", Order=1, GroupName="01. Gestión de Orden")]
        public int Quantity { get; set; }

        [NinjaScriptProperty]
        [Range(1, int.MaxValue)]
        [Display(Name="Stop Loss (Ticks)", Description="Distancia de Stop Loss en ticks", Order=2, GroupName="02. Gestión de Riesgo")]
        public int StopLossTicks { get; set; }

        [NinjaScriptProperty]
        [Range(1, int.MaxValue)]
        [Display(Name="Take Profit (Ticks)", Description="Distancia de Take Profit en ticks", Order=3, GroupName="02. Gestión de Riesgo")]
        public int TakeProfitTicks { get; set; }

        [NinjaScriptProperty]
        [Range(1, int.MaxValue)]
        [Display(Name="RSI Period", Description="Periodo del indicador RSI", Order=4, GroupName="03. Indicadores")]
        public int RsiPeriod { get; set; }

        [NinjaScriptProperty]
        [Range(1, 100)]
        [Display(Name="RSI Oversold", Description="Nivel de sobreventa", Order=5, GroupName="03. Indicadores")]
        public int RsiOversold { get; set; }

        [NinjaScriptProperty]
        [Range(1, 100)]
        [Display(Name="RSI Overbought", Description="Nivel de sobrecompra", Order=6, GroupName="03. Indicadores")]
        public int RsiOverbought { get; set; }

        [NinjaScriptProperty]
        [Range(1, int.MaxValue)]
        [Display(Name="ATR Period", Description="Periodo del Average True Range", Order=7, GroupName="03. Indicadores")]
        public int AtrPeriod { get; set; }

        [NinjaScriptProperty]
        [Range(0.1, 10.0)]
        [Display(Name="ATR Multiplier", Description="Multiplicador del ATR", Order=8, GroupName="03. Indicadores")]
        public double AtrMultiplier { get; set; }

        [NinjaScriptProperty]
        [Range(1, int.MaxValue)]
        [Display(Name="EMA Fast Period", Description="Periodo de la EMA Rápida", Order=9, GroupName="03. Indicadores")]
        public int EmaFastPeriod { get; set; }

        [NinjaScriptProperty]
        [Range(1, int.MaxValue)]
        [Display(Name="EMA Slow Period", Description="Periodo de la EMA Lenta", Order=10, GroupName="03. Indicadores")]
        public int EmaSlowPeriod { get; set; }
        #endregion
    }
}
`;

  return { className, fileName, code };
}
