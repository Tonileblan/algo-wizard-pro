import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getQuotes } from "@/lib/market.functions";
import { WATCHLIST } from "@/lib/market-symbols";

/** Live prices from the market-data provider, refreshed every minute. */
export function LiveMarketPanel() {
  const fetchQuotes = useServerFn(getQuotes);
  const { data, isPending, isError } = useQuery({
    queryKey: ["quotes"],
    queryFn: () => fetchQuotes({ data: { symbols: WATCHLIST.map((w) => w.symbol) } }),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  return (
    <Card className="bg-surface">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-primary" />
          <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            Mercado en vivo
          </h2>
        </div>
        {isPending && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        {isError ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            El proveedor de datos no responde ahora mismo.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {WATCHLIST.map((item) => {
              const quote = data?.find((q) => q.symbol === item.symbol);
              const change = quote?.changePct ?? 0;
              return (
                <div key={item.symbol} className="panel px-3 py-2.5">
                  <p className="truncate font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                    {item.label}
                  </p>
                  <p className="tabular mt-1 text-lg font-semibold">
                    {quote ? quote.price.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—"}
                  </p>
                  <p
                    className={
                      change >= 0
                        ? "tabular font-mono text-[11px] text-profit"
                        : "tabular font-mono text-[11px] text-loss"
                    }
                  >
                    {quote ? `${change >= 0 ? "+" : ""}${change.toFixed(2)}%` : "sin datos"}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
