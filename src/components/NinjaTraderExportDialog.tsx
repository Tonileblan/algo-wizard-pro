import { useState } from "react";
import { Check, Copy, Download, FileCode, HelpCircle, Terminal } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  generateNinjaScriptCode,
  type NinjaScriptOptions,
} from "@/lib/ninjascript-generator";
import type { GeneratedStrategy } from "@/lib/strategy-types";

export type NinjaTraderExportTarget =
  | { type: "strategy"; strategy: GeneratedStrategy }
  | { type: "custom"; options: NinjaScriptOptions }
  | null;

export function NinjaTraderExportDialog({
  target,
  onClose,
}: {
  target: NinjaTraderExportTarget;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  if (!target) return null;

  const data =
    target.type === "strategy"
      ? generateNinjaScriptCode(target.strategy)
      : generateNinjaScriptCode(target.options);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(data.code);
      setCopied(true);
      toast.success("Código copiado al portapapeles");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar el código automáticamente");
    }
  }

  function handleDownload() {
    try {
      const blob = new Blob([data.code], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = data.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Archivo ${data.fileName} descargado correctamente.`);
    } catch {
      toast.error("Error al descargar el archivo");
    }
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl border-border bg-surface sm:max-h-[90vh]">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px] tracking-widest text-primary">
              <Terminal className="mr-1 size-3" /> NINJASCRIPT EXPORTER
            </Badge>
            <Badge className="font-mono text-[9px] uppercase">NinjaTrader 8</Badge>
          </div>
          <DialogTitle className="text-xl font-bold flex items-center justify-between gap-2">
            <span>Exportar estrategia a NinjaTrader 8</span>
            <span className="font-mono text-xs font-normal text-muted-foreground">{data.fileName}</span>
          </DialogTitle>
          <DialogDescription>
            Archivo fuente en C# listo para compilar y ejecutar en NinjaTrader 8 con gestión de riesgo y parámetros integrados.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="code" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="code" className="gap-2 text-xs">
              <FileCode className="size-3.5" /> Código C# (.cs)
            </TabsTrigger>
            <TabsTrigger value="guide" className="gap-2 text-xs">
              <HelpCircle className="size-3.5" /> ¿Cómo importarlo en NinjaTrader?
            </TabsTrigger>
          </TabsList>

          <TabsContent value="code" className="space-y-3 mt-3">
            <div className="relative rounded-lg border border-border bg-background/80">
              <div className="flex items-center justify-between border-b border-border/80 px-4 py-2 text-xs font-mono text-muted-foreground">
                <span>{data.fileName}</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs font-mono"
                    onClick={handleCopy}
                  >
                    {copied ? <Check className="size-3 text-profit mr-1" /> : <Copy className="size-3 mr-1" />}
                    {copied ? "Copiado" : "Copiar C#"}
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 text-xs font-mono"
                    onClick={handleDownload}
                  >
                    <Download className="size-3 mr-1" /> Descargar .cs
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-80 w-full p-4 font-mono text-[11px] leading-relaxed text-foreground">
                <pre className="text-foreground whitespace-pre select-all">{data.code}</pre>
              </ScrollArea>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="font-mono text-[11px] text-muted-foreground">
                Ubicación recomendada: <code className="text-primary font-mono text-[10px]">Documents\NinjaTrader 8\bin\Custom\Strategies\</code>
              </p>
              <Button onClick={handleDownload} className="gap-2">
                <Download className="size-4" /> Descargar {data.fileName}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="guide" className="mt-3 space-y-4 text-sm">
            <div className="rounded-lg border border-border/70 bg-surface-2 p-4 space-y-3">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary/20 text-xs font-mono text-primary">1</span>
                Descargar y guardar el archivo .cs
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed pl-8">
                Descarga el archivo haciendo clic en el botón <strong>"Descargar .cs"</strong> y muévelo a la carpeta de estrategias personalizadas de NinjaTrader 8 en tu equipo:
                <br />
                <code className="mt-1.5 inline-block rounded bg-background px-2 py-1 font-mono text-[11px] text-primary">
                  C:\Users\[TuUsuario]\Documents\NinjaTrader 8\bin\Custom\Strategies\{data.fileName}
                </code>
              </p>
            </div>

            <div className="rounded-lg border border-border/70 bg-surface-2 p-4 space-y-3">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary/20 text-xs font-mono text-primary">2</span>
                Compilar en NinjaTrader 8
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed pl-8">
                Abre NinjaTrader 8, ve a la barra superior y selecciona <strong>Tools &rarr; NinjaScript Editor</strong>.
                En el editor, simplemente presiona la tecla <strong>F5</strong> (o haz clic en el botón verde de compilar). Verás la confirmación de compilación sin errores.
              </p>
            </div>

            <div className="rounded-lg border border-border/70 bg-surface-2 p-4 space-y-3">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary/20 text-xs font-mono text-primary">3</span>
                Añadir al gráfico o ejecutar en Strategy Analyzer
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed pl-8">
                Abre un gráfico con el instrumento correspondiente, haz clic derecho sobre el gráfico y selecciona <strong>Strategies</strong>. Busca <strong>{data.className}</strong> en la lista, ajusta los parámetros que desees y marca <strong>Enabled = True</strong>.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <Button onClick={handleDownload} className="gap-2">
                <Download className="size-4" /> Descargar {data.fileName}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
