import { Link } from "@tanstack/react-router";
import { Sparkles, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PlanTier } from "@/lib/plans";

export type UpsellState = { feature: string; requiredTier: PlanTier } | null;

export function UpsellDialog({
  state,
  onClose,
}: {
  state: UpsellState;
  onClose: () => void;
}) {
  const open = state !== null;
  const tierLabel = state?.requiredTier === "elite" ? "ELITE" : "PRO";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="border-primary/40 bg-surface sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Lock className="size-4" />
            </span>
            <Badge variant="default" className="font-mono text-[10px] tracking-widest">
              {tierLabel}
            </Badge>
          </div>
          <DialogTitle className="text-lg">
            Desbloquea {state?.feature ?? "esta función"} con el plan {tierLabel}
          </DialogTitle>
          <DialogDescription>
            Esta capacidad forma parte del motor cuantitativo avanzado: optimización de parámetros,
            simulaciones Monte Carlo y datos a nivel de tick con modelo de fricción real.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-start">
          <Button asChild>
            <Link to="/pricing" onClick={onClose}>
              <Sparkles className="size-4" /> Ver planes
            </Link>
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Seguir en modo actual
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
