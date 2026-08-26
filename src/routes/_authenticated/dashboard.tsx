import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BrainCircuit, CreditCard, LineChart, Receipt, Wrench } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAppState } from "@/hooks/use-app-state";
import { LiveMarketPanel } from "@/components/LiveMarketPanel";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — cuenta y límites de uso | QuantForge" },
      {
        name: "description",
        content:
          "Resumen de tu suscripción, límites de uso del plan y accesos rápidos al AI Studio, el builder manual y el motor de backtesting.",
      },
      { property: "og:title", content: "Dashboard — QuantForge" },
      {
        property: "og:description",
        content: "Estado de suscripción, consumo de generaciones de IA y accesos al motor quant.",
      },
    ],
  }),
  component: Dashboard,
});

/** Mocked Stripe Customer Portal redirect. */
function mockCustomerPortal(): Promise<string> {
  return new Promise((resolve) =>
    setTimeout(() => resolve("https://billing.stripe.com/p/session/mock_portal"), 700),
  );
}

function Dashboard() {
  const { subscription, plan, strategies, aiGenerationsUsed, email } = useAppState();

  const aiLimit = plan.aiGenerationsPerMonth;
  const aiPct = aiLimit === "unlimited" ? 12 : Math.min(100, (aiGenerationsUsed / Math.max(aiLimit, 1)) * 100);
  const stratLimit = plan.strategyLimit;
  const stratPct =
    stratLimit === "unlimited" ? 8 : Math.min(100, (strategies.length / Math.max(stratLimit, 1)) * 100);

  return (
    <AppShell>
      <div className="space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Badge variant="outline" className="mb-2 font-mono text-[10px] tracking-widest">
              DASHBOARD
            </Badge>
            <h1 className="text-2xl font-bold">Resumen de cuenta</h1>
            <p className="font-mono text-xs text-muted-foreground">
              {email ?? "cuenta"} · {subscription.stripe_customer_id ?? "sin cliente Stripe"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={async () => {
                const url = await mockCustomerPortal();
                toast.success("Portal de cliente de Stripe", { description: url });
              }}
            >
              <Receipt className="size-4" /> Facturación
            </Button>
            <Button asChild>
              <Link to="/pricing">
                <CreditCard className="size-4" /> Gestionar plan
              </Link>
            </Button>
          </div>
        </header>

        <LiveMarketPanel />

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="bg-surface lg:col-span-1">
            <CardHeader className="pb-2">
              <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                Suscripción
              </h2>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Plan" value={plan.name.toUpperCase()} />
              <Row
                label="Estado"
                value={subscription.status}
                tone={subscription.status === "active" ? "profit" : "loss"}
              />
              <Row label="Precio" value={`$${plan.price}/mes`} />
              <Row
                label="Renovación"
                value={new Date(subscription.current_period_end).toLocaleDateString("es-ES")}
              />
              <Separator />
              <Row label="subscription_id" value={subscription.stripe_subscription_id ?? "—"} />
            </CardContent>
          </Card>

          <Card className="bg-surface lg:col-span-2">
            <CardHeader className="pb-2">
              <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                Límites de uso del plan actual
              </h2>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between font-mono text-xs">
                  <span>Generaciones de IA</span>
                  <span className="text-muted-foreground">
                    {aiGenerationsUsed} / {aiLimit === "unlimited" ? "∞" : aiLimit}
                  </span>
                </div>
                <Progress value={aiPct} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between font-mono text-xs">
                  <span>Estrategias guardadas</span>
                  <span className="text-muted-foreground">
                    {strategies.length} / {stratLimit === "unlimited" ? "∞" : stratLimit}
                  </span>
                </div>
                <Progress value={stratPct} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Quick to="/ai-studio" icon={BrainCircuit} label="AI Studio" />
                <Quick to="/strategy-builder" icon={Wrench} label="Builder manual" />
                <Quick to="/backtest-engine" icon={LineChart} label="Backtest Engine" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-surface">
          <CardHeader className="pb-2">
            <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
              Estrategias recientes
            </h2>
          </CardHeader>
          <CardContent>
            {strategies.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Todavía no has generado estrategias.{" "}
                <Link to="/ai-studio" className="text-primary underline-offset-4 hover:underline">
                  Empieza en el AI Studio
                </Link>
                .
              </p>
            ) : (
              <div className="divide-y divide-border">
                {strategies.map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="text-sm font-semibold">{s.generated_logic.name}</span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {s.generated_logic.instrument.split(" ·")[0]}
                    </Badge>
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {s.generated_logic.timeframe}
                    </Badge>
                    <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                      {new Date(s.created_at).toLocaleString("es-ES")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "profit" | "loss" }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-mono text-xs text-muted-foreground">{label}</span>
      <span
        className={
          tone === "profit"
            ? "font-mono text-xs text-profit"
            : tone === "loss"
              ? "font-mono text-xs text-loss"
              : "truncate font-mono text-xs"
        }
      >
        {value}
      </span>
    </div>
  );
}

function Quick({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2.5 text-sm transition-colors hover:border-primary/50"
    >
      <Icon className="size-4 text-primary" />
      {label}
      <ArrowRight className="ml-auto size-3.5 text-muted-foreground" />
    </Link>
  );
}
