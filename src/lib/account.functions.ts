import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PlanTier } from "./plans";
import type { GeneratedStrategy } from "./strategy-types";

export type AccountSnapshot = {
  userId: string;
  email: string | null;
  displayName: string | null;
  subscription: {
    id: string;
    plan_tier: PlanTier;
    status: string;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    current_period_end: string;
    ai_generations_used: number;
  };
  strategies: GeneratedStrategy[];
};

const TIERS: PlanTier[] = ["free", "pro", "elite"];

/** Loads profile + subscription + saved strategies for the signed-in user. */
export const getAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccountSnapshot> => {
    const [{ data: profile }, subResult, strategiesResult] = await Promise.all([
      context.supabase.from("profiles").select("email, display_name").eq("id", context.userId).maybeSingle(),
      context.supabase
        .from("subscriptions")
        .select("id, plan_tier, status, stripe_customer_id, stripe_subscription_id, current_period_end, ai_generations_used")
        .eq("user_id", context.userId)
        .maybeSingle(),
      context.supabase
        .from("ai_generated_strategies")
        .select("id, prompt_original, ai_model_used, created_at, generated_logic")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    if (subResult.error) throw new Error(subResult.error.message);
    if (strategiesResult.error) throw new Error(strategiesResult.error.message);

    let sub = subResult.data;
    if (!sub) {
      const { data: created, error } = await context.supabase
        .from("subscriptions")
        .insert({ user_id: context.userId })
        .select("id, plan_tier, status, stripe_customer_id, stripe_subscription_id, current_period_end, ai_generations_used")
        .maybeSingle();
      if (error) throw new Error(error.message);
      sub = created;
    }

    return {
      userId: context.userId,
      email: profile?.email ?? (context.claims["email"] as string | undefined) ?? null,
      displayName: profile?.display_name ?? null,
      subscription: {
        id: sub?.id ?? "",
        plan_tier: (sub?.plan_tier ?? "free") as PlanTier,
        status: sub?.status ?? "active",
        stripe_customer_id: sub?.stripe_customer_id ?? null,
        stripe_subscription_id: sub?.stripe_subscription_id ?? null,
        current_period_end: sub?.current_period_end ?? new Date().toISOString(),
        ai_generations_used: sub?.ai_generations_used ?? 0,
      },
      strategies: (strategiesResult.data ?? []).map((row) => ({
        id: row.id,
        prompt_original: row.prompt_original,
        ai_model_used: row.ai_model_used,
        created_at: row.created_at,
        generated_logic: row.generated_logic as unknown as GeneratedStrategy["generated_logic"],
      })),
    };
  });

/**
 * Simulated Stripe checkout completion: persists the chosen tier server-side.
 * Replace with a Stripe webhook when real billing is wired up.
 */
export const setPlanTier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tier: PlanTier }) => {
    if (!TIERS.includes(input?.tier)) throw new Error("Plan desconocido");
    return { tier: input.tier };
  })
  .handler(async ({ data, context }) => {
    const end = new Date();
    end.setDate(end.getDate() + 30);
    const { error } = await context.supabase
      .from("subscriptions")
      .update({
        plan_tier: data.tier,
        status: "active",
        stripe_subscription_id: data.tier === "free" ? null : `sub_mock_${data.tier}`,
        current_period_end: end.toISOString(),
      })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { tier: data.tier };
  });
