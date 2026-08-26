# Quantitrading

🧾 PRD TÉCNICO V3 PARA LOVABLE: ALGO-TRADING SAAS & AI ENGINE

1. META-PROMPT Y STACK TÉCNICO ACTUALIZADO

Rol: Eres un AI Software Engineer experto construyendo un SaaS B2B/B2C de trading cuantitativo de alto rendimiento. Stack Estricto Adicional:

Pagos: Stripe (checkout y portal de cliente).

Gráficos Avanzados: Recharts (para Equity Curves y Drawdown) y grillas de Tailwind para "Heatmaps" de optimización de parámetros.

UI Adicional Shadcn: Pricing, Accordion, HoverCard, Badge (para destacar funcionalidades PRO), ScrollArea (para logs de trades), Skeleton (para cargas de IA).

2. ARQUITECTURA DE BASE DE DATOS EXTENDIDA (Supabase)

Actualiza los esquemas para soportar el modelo SaaS, el backtesting avanzado y la generación por IA:

subscriptions: id, user_id (FK), stripe_customer_id, stripe_subscription_id, plan_tier (text: 'free', 'pro', 'elite'), status (text: 'active', 'canceled', 'past_due'), current_period_end (timestamptz).

ai_generated_strategies: id, user_id (FK), prompt_original (text), generated_logic (jsonb), ai_model_used (text), created_at.

advanced_backtests: id, strategy_id (FK), dataset_used (text), slippage_assumed (numeric), commission_per_trade (numeric), trade_log (jsonb - array de todas las operaciones), parameter_matrix (jsonb - resultados de optimización 3D), max_consecutive_losses (int).

3. MAPA DE RUTAS Y PAYWALL LOGIC

Implementa protección de rutas (Route Guards) basada en el plan_tier del usuario.

/pricing: Tabla de precios y planes (Free, Pro, Elite). Botones de integración con Stripe Checkout.

/ai-studio [PRO/ELITE]: Interfaz principal del generador de estrategias "Prompt-to-Algorithm".

/strategy-builder: El Wizard de 9 pasos (versión manual).

/backtest-engine [PRO/ELITE]: Dashboard de análisis profundo de backtesting.

/dashboard: Resumen de cuenta, límites de uso del plan actual.

4. DESGLOSE DE NUEVOS MÓDULOS CORE

A. Módulo: SaaS & Monetización (PricingView.tsx)

UI: Crea una tabla de precios con 3 niveles usando las Cards de Shadcn.

Free: 1 estrategia, manual builder, backtest básico.

Pro: $49/mes. IA Strategy Gen (limitado), conexión Tradovate, exportación NinjaTrader.

Elite: $149/mes. IA Ilimitada, Backtesting avanzado (ticks, slippage), Matrix Optimization.

Lógica: Botones "Subscribe" que simulan la llamada a Edge Functions para crear la sesión de Stripe.

B. Módulo: AI Strategy Studio (AIStrategyGenerator.tsx)

Concepto: Un entorno similar a ChatGPT pero enfocado a código y lógica quant.

UI:

Un input principal gigante: "Describe tu estrategia..." (Ej: Quiero una estrategia de reversión a la media en el Nasdaq, usando el VWAP y confirmación de RSI sobrevendido, con un stop loss fijo de 20 ticks).

Estado de Carga: Mientras la IA piensa, muestra un Skeleton estructurado y mensajes como "Analizando variables...", "Generando árbol de decisión...", "Escribiendo parámetros para NinjaTrader...".

Output: Genera un Dashboard dinámico mostrando: La lógica interpretada en lenguaje natural, los parámetros propuestos, y un botón "Llevar a Backtest".

C. Módulo: Advanced Backtesting Dashboard (BacktestAnalyzer.tsx)

Este módulo es visualmente denso, estilo terminal Bloomberg o QuantConnect.

Gráfico 1 (Equity & Drawdown): Gráfico dual. Arriba la curva de capital (Recharts AreaChart verde). Abajo, un histograma rojo que muestra el Drawdown en porcentaje relativo.

Heatmap de Optimización: Una matriz (creada con divs y Tailwind bg-colors) que muestra el cruce de 2 variables (Ej: Periodo RSI vs Multiplicador ATR). Celdas verdes = profit, celdas rojas = pérdida.

Trade Log Tab: Una Shadcn Table virtualizada con ScrollArea que muestre cientos de simulaciones de trades (Fecha, Lado, Entry, Exit, PnL, Acumulado).

Panel de Fricción: Inputs para ajustar Comisiones, Slippage y Latencia, actualizando las métricas en tiempo real.

5. REGLAS DE UI/UX (Gating & Upselling)

En las vistas gratuitas, si el usuario hace clic en una funcionalidad avanzada (ej. botón "Optimización Monte Carlo"), no lo bloquees de golpe; muestra un Dialog o HoverCard estilizado que diga: "Desbloquea simulaciones Monte Carlo con el plan PRO" y un botón "Ver Planes".

Mantén la consistencia visual: El "AI Studio" debe verse futurista (acentos violetas o neón), mientras que el "Backtest Analyzer" debe verse puramente analítico y matemático (monocromático con verde/rojo para ganancias/pérdidas).

6. INSTRUCCIONES DE GENERACIÓN PARA LA IA

Empieza integrando el módulo de PricingView y la lógica de estado del usuario (suscripción).

Construye la interfaz de AIStrategyGenerator, enfocándote en la experiencia de carga y la visualización de la estrategia autogenerada.

Desarrolla el BacktestAnalyzer construyendo los gráficos duales y la tabla de logs.

Genera funciones mock en el frontend para simular la respuesta de Stripe y las respuestas del LLM generador de estrategias para que la UI sea 100% testeable sin el backend conectado todavía.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://algo-wizard-pro.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bbe8cda0-2702-49ce-9692-0fa2c4cefc7b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
