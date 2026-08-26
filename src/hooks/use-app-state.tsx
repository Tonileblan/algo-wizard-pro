import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getPlan, hasAccess, type Plan, type PlanTier } from "@/lib/plans";
import type { GeneratedStrategy } from "@/lib/mock-ai";

export type Subscription = {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  plan_tier: PlanTier;
  status: "active" | "canceled" | "past_due";
  current_period_end: string;
};

type AppState = {
  subscription: Subscription;
  plan: Plan;
  can: (required: PlanTier) => boolean;
  aiGenerationsUsed: number;
  strategies: GeneratedStrategy[];
  activeStrategy: GeneratedStrategy | null;
  setPlanTier: (tier: PlanTier) => void;
  registerStrategy: (strategy: GeneratedStrategy) => void;
  setActiveStrategy: (strategy: GeneratedStrategy | null) => void;
};

const STORAGE_KEY = "quantforge.state.v1";

const AppStateContext = createContext<AppState | null>(null);

function defaultSubscription(): Subscription {
  const end = new Date();
  end.setDate(end.getDate() + 30);
  return {
    id: "sub_local_0001",
    user_id: "usr_demo_0001",
    stripe_customer_id: "cus_mock_8sK21",
    stripe_subscription_id: null,
    plan_tier: "free",
    status: "active",
    current_period_end: end.toISOString(),
  };
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [subscription, setSubscription] = useState<Subscription>(defaultSubscription);
  const [strategies, setStrategies] = useState<GeneratedStrategy[]>([]);
  const [activeStrategy, setActiveStrategy] = useState<GeneratedStrategy | null>(null);

  // Read persisted demo state after hydration to avoid SSR mismatches.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        subscription?: Subscription;
        strategies?: GeneratedStrategy[];
      };
      if (parsed.subscription) setSubscription(parsed.subscription);
      if (parsed.strategies) setStrategies(parsed.strategies);
    } catch {
      /* ignore corrupted demo state */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ subscription, strategies }));
    } catch {
      /* storage unavailable */
    }
  }, [subscription, strategies]);

  const setPlanTier = useCallback((tier: PlanTier) => {
    setSubscription((prev) => ({
      ...prev,
      plan_tier: tier,
      status: "active",
      stripe_subscription_id: tier === "free" ? null : `sub_mock_${tier}_92Kd`,
    }));
  }, []);

  const registerStrategy = useCallback((strategy: GeneratedStrategy) => {
    setStrategies((prev) => [strategy, ...prev].slice(0, 20));
  }, []);

  const value = useMemo<AppState>(() => {
    const plan = getPlan(subscription.plan_tier);
    return {
      subscription,
      plan,
      can: (required: PlanTier) => hasAccess(subscription.plan_tier, required),
      aiGenerationsUsed: strategies.length,
      strategies,
      activeStrategy,
      setPlanTier,
      registerStrategy,
      setActiveStrategy,
    };
  }, [subscription, strategies, activeStrategy, setPlanTier, registerStrategy]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used inside AppStateProvider");
  return ctx;
}
