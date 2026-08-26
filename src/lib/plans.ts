export type PlanTier = "free" | "pro" | "elite";

export type PlanFeature = { label: string; included: boolean };

export type Plan = {
  tier: PlanTier;
  name: string;
  price: number;
  tagline: string;
  highlight?: boolean;
  strategyLimit: number | "unlimited";
  aiGenerationsPerMonth: number | "unlimited";
  features: PlanFeature[];
};

export const PLANS: Plan[] = [
  {
    tier: "free",
    name: "Free",
    price: 0,
    tagline: "Aprende la mecánica del trading sistemático.",
    strategyLimit: 1,
    aiGenerationsPerMonth: 0,
    features: [
      { label: "1 estrategia guardada", included: true },
      { label: "Strategy Builder manual (9 pasos)", included: true },
      { label: "Backtest básico (barras diarias)", included: true },
      { label: "AI Strategy Studio", included: false },
      { label: "Conexión Tradovate", included: false },
      { label: "Exportación NinjaTrader", included: false },
      { label: "Backtesting avanzado (ticks, slippage)", included: false },
      { label: "Matrix Optimization / Monte Carlo", included: false },
    ],
  },
  {
    tier: "pro",
    name: "Pro",
    price: 49,
    tagline: "Para el trader sistemático que itera cada semana.",
    highlight: true,
    strategyLimit: 25,
    aiGenerationsPerMonth: 50,
    features: [
      { label: "25 estrategias guardadas", included: true },
      { label: "Strategy Builder manual (9 pasos)", included: true },
      { label: "AI Strategy Gen (50 / mes)", included: true },
      { label: "Conexión Tradovate", included: true },
      { label: "Exportación NinjaTrader", included: true },
      { label: "Backtest con comisiones y slippage", included: true },
      { label: "Backtesting a nivel de tick", included: false },
      { label: "Matrix Optimization / Monte Carlo", included: false },
    ],
  },
  {
    tier: "elite",
    name: "Elite",
    price: 149,
    tagline: "Infraestructura quant completa, sin límites.",
    strategyLimit: "unlimited",
    aiGenerationsPerMonth: "unlimited",
    features: [
      { label: "Estrategias ilimitadas", included: true },
      { label: "AI Strategy Gen ilimitada", included: true },
      { label: "Conexión Tradovate + multi-cuenta", included: true },
      { label: "Exportación NinjaTrader / C#", included: true },
      { label: "Backtesting avanzado a nivel de tick", included: true },
      { label: "Modelo de fricción: slippage + latencia", included: true },
      { label: "Matrix Optimization 3D", included: true },
      { label: "Simulaciones Monte Carlo", included: true },
    ],
  },
];

export const TIER_RANK: Record<PlanTier, number> = { free: 0, pro: 1, elite: 2 };

export function getPlan(tier: PlanTier): Plan {
  return PLANS.find((p) => p.tier === tier) ?? PLANS[0]!;
}

export function hasAccess(tier: PlanTier, required: PlanTier): boolean {
  return TIER_RANK[tier] >= TIER_RANK[required];
}
