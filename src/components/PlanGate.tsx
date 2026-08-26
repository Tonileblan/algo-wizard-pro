import { Link } from "@tanstack/react-router";
import { Lock, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/hooks/use-app-state";
import type { PlanTier } from "@/lib/plans";

/** Route guard: renders children only when the subscription tier is sufficient. */
export function PlanGate({
  required,
  title,
  description,
  children,
}: {
  required: PlanTier;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const { can } = useAppState();
  if (can(required)) return <>{children}</>;

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-xl border border-primary/40 bg-surface px-8 py-16 text-center shadow-neon">
      <span className="flex size-12 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Lock className="size-5" />
      </span>
      <Badge className="font-mono text-[10px] tracking-widest">
        {required === "elite" ? "ELITE" : "PRO"}
      </Badge>
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="mt-2 flex gap-2">
        <Button asChild>
          <Link to="/pricing">
            <Sparkles className="size-4" /> Ver planes
          </Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link to="/dashboard">Volver al dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
