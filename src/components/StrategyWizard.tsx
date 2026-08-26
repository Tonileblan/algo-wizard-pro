import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UpsellDialog, type UpsellState } from "@/components/UpsellDialog";
import { useAppState } from "@/hooks/use-app-state";

type Field =
  | { key: string; label: string; type: "text" | "number" | "textarea"; placeholder?: string }
  | { key: string; label: string; type: "select"; options: string[] };

const STEPS: Array<{ title: string; hint: string; fields: Field[]; proOnly?: boolean }> = [
  {
    title: "Identidad",
    hint: "Nombra la estrategia y define su tesis en una frase.",
    fields: [
      { key: "name", label: "Nombre", type: "text", placeholder: "VWAP Reversion MNQ" },
      { key: "thesis", label: "Tesis de mercado", type: "textarea", placeholder: "Por qué existe la ineficiencia..." },
    ],
  },
  {
    title: "Instrumento",
    hint: "Mercado y timeframe operativo.",
    fields: [
      { key: "instrument", label: "Instrumento", type: "select", options: ["MNQ", "ES", "CL", "GC", "BTC"] },
      { key: "timeframe", label: "Timeframe", type: "select", options: ["1 min", "3 min", "5 min", "15 min", "1 h"] },
    ],
  },
  {
    title: "Sesión y filtros",
    hint: "Cuándo se permite operar.",
    fields: [
      { key: "session", label: "Ventana horaria", type: "text", placeholder: "09:35–15:45 ET" },
      { key: "volFilter", label: "Filtro de volatilidad (ATR mínimo)", type: "number" },
    ],
  },
  {
    title: "Indicadores",
    hint: "Señales base de la lógica.",
    fields: [
      { key: "primary", label: "Indicador primario", type: "select", options: ["VWAP", "EMA(21)", "Bollinger(20,2)", "Opening Range"] },
      { key: "confirm", label: "Confirmación", type: "select", options: ["RSI(14)", "Stochastic", "RVOL", "Delta divergence"] },
    ],
  },
  {
    title: "Reglas de entrada",
    hint: "Condición exacta que dispara la orden.",
    fields: [{ key: "entry", label: "Condición de entrada", type: "textarea" }],
  },
  {
    title: "Reglas de salida",
    hint: "Objetivo, salida por tiempo y trailing.",
    fields: [
      { key: "takeProfit", label: "Take profit (ticks)", type: "number" },
      { key: "timeExit", label: "Salida por tiempo (barras)", type: "number" },
    ],
  },
  {
    title: "Gestión de riesgo",
    hint: "Stop, riesgo por operación y corte diario.",
    fields: [
      { key: "stopLoss", label: "Stop loss (ticks)", type: "number" },
      { key: "riskPct", label: "Riesgo por operación (%)", type: "number" },
      { key: "dailyStop", label: "Corte diario (%)", type: "number" },
    ],
  },
  {
    title: "Position sizing",
    hint: "Contratos y escalado.",
    fields: [
      { key: "contracts", label: "Contratos base", type: "number" },
      { key: "sizing", label: "Modelo de sizing", type: "select", options: ["Fijo", "Volatilidad (ATR)", "Fracción de Kelly"] },
    ],
  },
  {
    title: "Exportación",
    hint: "Destino de ejecución del paquete generado.",
    proOnly: true,
    fields: [
      { key: "target", label: "Plataforma destino", type: "select", options: ["NinjaTrader 8", "Tradovate", "JSON genérico"] },
    ],
  },
];

export function StrategyWizard() {
  const { can } = useAppState();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [upsell, setUpsell] = useState<UpsellState>(null);

  const current = STEPS[step]!;
  const locked = current.proOnly === true && !can("pro");

  function next() {
    if (step === STEPS.length - 1) {
      toast.success("Estrategia guardada", {
        description: "Lista para backtest en el motor de análisis.",
      });
      return;
    }
    const upcoming = STEPS[step + 1]!;
    if (upcoming.proOnly && !can("pro")) {
      setUpsell({ feature: "la exportación a NinjaTrader / Tradovate", requiredTier: "pro" });
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <UpsellDialog state={upsell} onClose={() => setUpsell(null)} />

      <header>
        <Badge variant="outline" className="mb-2 font-mono text-[10px] tracking-widest">
          STRATEGY BUILDER
        </Badge>
        <h1 className="text-2xl font-bold">Wizard manual de 9 pasos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Control total sobre cada componente de la lógica, sin IA.
        </p>
      </header>

      <div className="space-y-2">
        <Progress value={((step + 1) / STEPS.length) * 100} />
        <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
          <span>
            PASO {step + 1} / {STEPS.length} · {current.title}
          </span>
          <span>{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
        </div>
      </div>

      <Card className="bg-surface">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{current.title}</h2>
            {current.proOnly && (
              <Badge className="font-mono text-[9px] tracking-widest">PRO</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{current.hint}</p>
        </CardHeader>
        <CardContent className="space-y-5">
          {locked ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-primary/40 bg-background/60 px-6 py-10 text-center">
              <Lock className="size-5 text-primary" />
              <p className="text-sm font-semibold">La exportación requiere plan Pro</p>
              <Button size="sm" onClick={() => setUpsell({ feature: "la exportación", requiredTier: "pro" })}>
                Ver planes
              </Button>
            </div>
          ) : (
            current.fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label className="font-mono text-xs">{field.label}</Label>
                {field.type === "textarea" ? (
                  <Textarea
                    rows={4}
                    value={values[field.key] ?? ""}
                    placeholder={field.placeholder}
                    onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
                  />
                ) : field.type === "select" ? (
                  <Select
                    value={values[field.key] ?? ""}
                    onValueChange={(v) => setValues({ ...values, [field.key]: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona..." />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={field.type}
                    value={values[field.key] ?? ""}
                    placeholder={field.placeholder}
                    onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
                    className={field.type === "number" ? "tabular" : ""}
                  />
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          <ChevronLeft className="size-4" /> Anterior
        </Button>
        <Button onClick={next}>
          {step === STEPS.length - 1 ? (
            <>
              <Check className="size-4" /> Guardar estrategia
            </>
          ) : (
            <>
              Siguiente <ChevronRight className="size-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
