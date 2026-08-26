import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { Check, Loader2, Minus, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { PLANS, TIER_RANK, type PlanTier } from "@/lib/plans";
import { useAppState } from "@/hooks/use-app-state";

/**
 * Mocked Stripe Checkout / Customer Portal calls.
 * Replace with an Edge Function that creates the session and redirects.
 */
function mockStripeCheckout(tier: PlanTier): Promise<{ url: string; sessionId: string }> {
  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve({
          sessionId: `cs_test_mock_${tier}_${Math.random().toString(36).slice(2, 10)}`,
          url: `https://checkout.stripe.com/c/pay/mock_${tier}`,
        }),
      1100,
    ),
  );
}

const FAQ = [
  {
    q: "¿Puedo cambiar de plan en cualquier momento?",
    a: "Sí. El cambio se prorratea automáticamente y el nuevo periodo se refleja en current_period_end de tu suscripción.",
  },
  {
    q: "¿Qué diferencia hay entre backtest básico y avanzado?",
    a: "El básico usa barras y asume ejecución perfecta. El avanzado reconstruye la sesión a nivel de tick e incorpora comisiones, slippage y latencia, además del log completo de operaciones.",
  },
  {
    q: "¿La IA escribe código ejecutable?",
    a: "La IA genera la lógica estructurada (indicadores, reglas, parámetros) y la traduce a un paquete exportable para NinjaTrader. Siempre revisas y validas con backtest antes de operar.",
  },
  {
    q: "¿Hay cancelación sin penalización?",
    a: "Sí, cancelas desde el portal de cliente de Stripe y conservas el acceso hasta el final del periodo pagado.",
  },
];

export function PricingView() {
  const navigate = useNavigate();
  const { subscription, setPlanTier, isAuthenticated } = useAppState();
  const [loadingTier, setLoadingTier] = useState<PlanTier | null>(null);

  async function subscribe(tier: PlanTier) {
    if (!isAuthenticated) {
      navigate({ to: "/auth", search: { redirect: "/pricing" } });
      return;
    }
    setLoadingTier(tier);
    const session = await mockStripeCheckout(tier);
    try {
      await setPlanTier(tier);
    } catch (error) {
      setLoadingTier(null);
      toast.error(error instanceof Error ? error.message : "No se pudo activar el plan.");
      return;
    }
    setLoadingTier(null);
    toast.success(`Suscripción ${tier.toUpperCase()} activada`, {
      description: `Sesión de Stripe simulada: ${session.sessionId}`,
    });
  }

  return (
    <div className="space-y-14">
      <header className="mx-auto max-w-2xl text-center">
        <Badge variant="outline" className="mb-4 font-mono text-[10px] tracking-widest">
          PRICING
        </Badge>
        <h1 className="text-3xl font-bold sm:text-4xl">
          Elige la potencia de tu infraestructura quant
        </h1>
        <p className="mt-3 text-muted-foreground">
          Del builder manual al motor de optimización a nivel de tick. Sin contratos, cancela cuando
          quieras.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = subscription.plan_tier === plan.tier;
          const isDowngrade = TIER_RANK[plan.tier] < TIER_RANK[subscription.plan_tier];
          return (
            <Card
              key={plan.tier}
              className={
                plan.highlight
                  ? "relative border-primary/60 bg-surface shadow-neon"
                  : "relative bg-surface"
              }
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 font-mono text-[10px] tracking-widest text-primary-foreground">
                  MÁS ELEGIDO
                </span>
              )}
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="font-mono text-sm tracking-widest uppercase">{plan.name}</h2>
                  {isCurrent && (
                    <Badge variant="secondary" className="text-[10px]">
                      Plan actual
                    </Badge>
                  )}
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="tabular text-4xl font-bold">${plan.price}</span>
                  <span className="text-sm text-muted-foreground">/mes</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{plan.tagline}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f.label} className="flex items-start gap-2 text-sm">
                      {f.included ? (
                        <Check className="mt-0.5 size-4 shrink-0 text-profit" />
                      ) : (
                        <Minus className="mt-0.5 size-4 shrink-0 text-muted-foreground/60" />
                      )}
                      <span className={f.included ? "" : "text-muted-foreground/60 line-through"}>
                        {f.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="flex-col items-stretch gap-2">
                <Button
                  variant={plan.highlight ? "default" : "secondary"}
                  disabled={isCurrent || loadingTier !== null}
                  onClick={() => subscribe(plan.tier)}
                >
                  {loadingTier === plan.tier ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Creando sesión de Stripe...
                    </>
                  ) : isCurrent ? (
                    "Plan activo"
                  ) : isDowngrade ? (
                    `Bajar a ${plan.name}`
                  ) : plan.price === 0 ? (
                    "Empezar gratis"
                  ) : (
                    <>
                      <Sparkles className="size-4" /> Subscribe · ${plan.price}
                    </>
                  )}
                </Button>
                <p className="text-center font-mono text-[10px] text-muted-foreground">
                  {plan.aiGenerationsPerMonth === "unlimited"
                    ? "AI GEN: ILIMITADA"
                    : `AI GEN: ${plan.aiGenerationsPerMonth}/MES`}
                  {" · "}
                  {plan.strategyLimit === "unlimited"
                    ? "STRATEGIES: ∞"
                    : `STRATEGIES: ${plan.strategyLimit}`}
                </p>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="size-4 text-profit" />
        Pagos gestionados por Stripe · portal de cliente para facturas y cancelación
      </div>

      <section className="mx-auto max-w-3xl">
        <h2 className="mb-4 text-xl font-semibold">Preguntas frecuentes</h2>
        <Accordion type="single" collapsible className="panel px-4">
          {FAQ.map((item) => (
            <AccordionItem key={item.q} value={item.q}>
              <AccordionTrigger className="text-left text-sm">{item.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
