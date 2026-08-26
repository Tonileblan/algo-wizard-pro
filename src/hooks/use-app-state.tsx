import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getPlan, hasAccess, type Plan, type PlanTier } from "@/lib/plans";
import { getAccount, setPlanTier as setPlanTierFn, type AccountSnapshot } from "@/lib/account.functions";
import type { GeneratedStrategy } from "@/lib/strategy-types";

export type Subscription = AccountSnapshot["subscription"];

type AppState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  email: string | null;
  displayName: string | null;
  subscription: Subscription;
  plan: Plan;
  can: (required: PlanTier) => boolean;
  aiGenerationsUsed: number;
  strategies: GeneratedStrategy[];
  activeStrategy: GeneratedStrategy | null;
  setPlanTier: (tier: PlanTier) => Promise<void>;
  refresh: () => Promise<void>;
  setActiveStrategy: (strategy: GeneratedStrategy | null) => void;
  signOut: () => Promise<void>;
};

const AppStateContext = createContext<AppState | null>(null);

function anonymousSubscription(): Subscription {
  return {
    id: "",
    plan_tier: "free",
    status: "active",
    stripe_customer_id: null,
    stripe_subscription_id: null,
    current_period_end: new Date().toISOString(),
    ai_generations_used: 0,
  };
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const fetchAccount = useServerFn(getAccount);
  const updatePlan = useServerFn(setPlanTierFn);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [activeStrategy, setActiveStrategy] = useState<GeneratedStrategy | null>(null);

  // Session lives in localStorage, so resolve it after hydration only.
  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSessionUserId(data.session?.user.id ?? null);
      setSessionReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setSessionUserId(session?.user.id ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const accountQuery = useQuery({
    queryKey: ["account", sessionUserId],
    queryFn: () => fetchAccount(),
    enabled: Boolean(sessionUserId),
    staleTime: 30_000,
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["account"] });
  }, [queryClient]);

  const setPlanTier = useCallback(
    async (tier: PlanTier) => {
      await updatePlan({ data: { tier } });
      await refresh();
    },
    [updatePlan, refresh],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    setActiveStrategy(null);
  }, [queryClient]);

  const account = accountQuery.data;

  const value = useMemo<AppState>(() => {
    const subscription = account?.subscription ?? anonymousSubscription();
    const plan = getPlan(subscription.plan_tier);
    return {
      isAuthenticated: Boolean(sessionUserId),
      isLoading: !sessionReady || (Boolean(sessionUserId) && accountQuery.isPending),
      email: account?.email ?? null,
      displayName: account?.displayName ?? null,
      subscription,
      plan,
      can: (required: PlanTier) => hasAccess(subscription.plan_tier, required),
      aiGenerationsUsed: subscription.ai_generations_used,
      strategies: account?.strategies ?? [],
      activeStrategy,
      setPlanTier,
      refresh,
      setActiveStrategy,
      signOut,
    };
  }, [
    account,
    sessionUserId,
    sessionReady,
    accountQuery.isPending,
    activeStrategy,
    setPlanTier,
    refresh,
    signOut,
  ]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used inside AppStateProvider");
  return ctx;
}
