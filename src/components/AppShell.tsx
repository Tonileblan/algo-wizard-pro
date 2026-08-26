import { Link } from "@tanstack/react-router";
import { Activity, BrainCircuit, LayoutDashboard, LineChart, Tag, Wrench } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { useAppState } from "@/hooks/use-app-state";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/ai-studio", label: "AI Studio", icon: BrainCircuit },
  { to: "/strategy-builder", label: "Builder", icon: Wrench },
  { to: "/backtest-engine", label: "Backtest", icon: LineChart },
  { to: "/pricing", label: "Planes", icon: Tag },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { plan } = useAppState();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-6 px-4">
          <Link to="/" className="flex items-center gap-2">
            <Activity className="size-5 text-primary" />
            <span className="font-mono text-sm font-bold tracking-tight">QUANTFORGE</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-secondary text-foreground" }}
              >
                <Icon className="size-3.5" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Badge
              variant={plan.tier === "free" ? "outline" : "default"}
              className="font-mono text-[10px] tracking-widest uppercase"
            >
              {plan.name}
            </Badge>
            <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
              usr_demo_0001
            </span>
          </div>
        </div>
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-border px-3 py-1.5 md:hidden">
          {NAV.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="rounded px-2.5 py-1 text-xs whitespace-nowrap text-muted-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-[1600px] px-4 py-8">{children}</main>
      <footer className="border-t border-border px-4 py-6">
        <p className="mx-auto max-w-[1600px] font-mono text-[11px] text-muted-foreground">
          QuantForge · entorno de demostración · datos simulados, sin ejecución real de órdenes.
        </p>
      </footer>
    </div>
  );
}
