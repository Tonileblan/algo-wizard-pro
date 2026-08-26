# De simulación a datos reales + IA real

Hoy toda la app funciona con motores locales simulados: `src/lib/mock-ai.ts` inventa la lógica de estrategia con reglas de texto, `src/lib/mock-backtest.ts` genera velas y operaciones de forma determinista, y el estado (plan, estrategias) vive en `localStorage`. No existe backend ni ninguna llamada externa.

El plan sustituye esas dos piezas por servicios reales, manteniendo la misma UI.

## 1. Backend (Lovable Cloud)

Se activa Supabase para tener base de datos, autenticación y secretos. Tablas:

- `profiles` + `user_roles` — usuarios y roles.
- `subscriptions` — `plan_tier` (free/pro/elite), estado, periodo. Los guards de plan pasan a leer de aquí en lugar de `localStorage`.
- `ai_generated_strategies` — prompt, modelo usado, lógica generada (JSON), dueño.
- `advanced_backtests` — parámetros, métricas, curva de equity y trades del resultado.
- `market_candles` — caché de velas históricas por símbolo/temporalidad (evita repetir llamadas al proveedor y hace los backtests reproducibles).

Todas con RLS: cada usuario solo ve sus estrategias y backtests; las velas son de lectura pública.

## 2. Datos de mercado reales

Proveedor: **Twelve Data** (plan gratuito, cubre acciones, índices, forex y cripto con históricos intradía y precio actual; los futuros CME reales requieren un feed profesional de pago, así que se mapean los símbolos a sus equivalentes líquidos, p. ej. NQ→QQQ/NDX, ES→SPY, CL→USO, BTC→BTC/USD).

- La API key se guarda como secreto del proyecto y **solo** se usa en el servidor.
- Nuevas server functions:
  - `getCandles({ symbol, interval, from, to })` — busca primero en `market_candles`; si falta, pide al proveedor, guarda y devuelve.
  - `getQuote({ symbols })` — último precio, cacheado ~30s, para el panel de mercado en vivo.
- El dashboard añade un bloque de precios actuales con refresco periódico (TanStack Query, `refetchInterval`).
- El buscador de símbolos valida contra el proveedor para no aceptar tickers inexistentes.

## 3. Backtest sobre datos reales

`mock-backtest.ts` se reemplaza por un motor real en servidor que:

- Carga las velas reales del símbolo/temporalidad elegidos.
- Ejecuta las reglas de la estrategia barra a barra (entradas, salidas, stop/target, filtros de sesión).
- Aplica los modelos de fricción que ya existen en la UI (slippage, comisión, latencia).
- Calcula métricas reales (PF, win rate, drawdown, Sharpe, curva de equity) y guarda el resultado en `advanced_backtests`.
- La optimización en matriz (Elite) ejecuta el motor por combinación de parámetros; si la rejilla es grande, se procesa por lotes con progreso en la UI.

Los gráficos de Recharts y el heatmap no cambian de forma: reciben los mismos tipos de datos, ahora reales.

## 4. IA real

- Se usa **Lovable AI** (sin que tú aportes claves ni cuentas). Modelo por defecto de razonamiento con streaming.
- El prompt del usuario se envía a una server function que devuelve la estrategia como **JSON estructurado y validado** (nombre, instrumento, temporalidad, tesis, reglas, parámetros, indicadores), es decir el mismo tipo `GeneratedStrategy` que ya consume la UI.
- El "motor de razonamiento" actual (pasos falsos con temporizadores) se sustituye por el razonamiento real del modelo en streaming, así que verás el pensamiento auténtico mientras genera.
- Se le da contexto real: símbolos disponibles y estadísticas del histórico, para que las reglas sean ejecutables por el motor de backtest.
- La estrategia generada se guarda en `ai_generated_strategies` y las cuotas por plan se cuentan en base de datos, no en el navegador.
- Errores del gateway (sin créditos, límite de uso) se muestran en la UI con su mensaje real.

## 5. Autenticación y planes

- Pantalla de acceso (email + contraseña) y rutas protegidas reales; hoy el "plan" se puede cambiar desde el navegador.
- Stripe sigue simulado en esta fase: el cambio de plan escribe en `subscriptions`. Cuando quieras cobrar de verdad se conecta Stripe en un paso aparte.

## Notas técnicas

- Server functions en `src/lib/*.functions.ts`; clave del proveedor leída con `process.env` dentro de cada `.handler()`.
- Migración SQL única con tablas, `GRANT`s, RLS y políticas.
- Límite de peticiones al proveedor gestionado con la caché de `market_candles` y batch de símbolos en las cotizaciones.
- La IA se llama vía Responses API con streaming y salida estructurada estricta.
- Se mantienen los tipos actuales (`GeneratedStrategy`, resultados de backtest) para no rehacer los componentes.

## Orden de entrega

1. Cloud + esquema + auth y planes reales.
2. Datos de mercado (históricos con caché + precio actual en dashboard).
3. Motor de backtest real sobre esas velas (+ optimización).
4. IA real con streaming de razonamiento y persistencia.
