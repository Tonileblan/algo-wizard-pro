# Por qué ninguna estrategia funciona (y cómo arreglarlo)

## Diagnóstico (verificado en la base de datos)

Revisé los 15 backtests guardados y las 3 estrategias generadas por la IA. El motor **sí ejecuta** sobre velas reales (22.079 velas en caché), pero los resultados son sistemáticamente malos y poco creíbles:

- QQQ 1h: 46 operaciones, −663 $, profit factor 0,25 · otro: 11 operaciones, win rate 0 %
- BTC-USD 1h: 10 operaciones, −14,30 $ (una cifra imposible para 10 trades de Bitcoin)
- Las 3 estrategias generadas por la IA salieron con el mismo estilo, "Mean Reversion"

Hay cuatro causas concretas:

1. **Economía del contrato mal calibrada.** BTC usa `tickSize: 1` con `tickValue: 0.01`, así que un movimiento de 1.000 $ en Bitcoin vale 10 $ de P&L; los ETF proxy usan `tickSize: 0.01` con `tickValue: 1`, es decir 100 $ por dólar de movimiento. Cada instrumento vive en una escala distinta y ninguna corresponde al contrato real que muestra la etiqueta (MNQ, ES, CL).
2. **La salida no corresponde al estilo.** Toda estrategia sale solo por stop fijo o por objetivo a 1,8R. Una reversión a la media debe salir al volver a la media (y por tiempo máximo en posición); con objetivo 1,8R el stop se toca casi siempre primero → profit factor < 1 estructural.
3. **Stops demasiado ajustados frente al ruido.** El stop es `max(stopTicks·tickSize, ATR·mult·0,35)`; ese 0,35 reduce el ATR y deja stops por debajo del ruido de la barra, mientras la fricción (comisión + slippage + latencia) se cobra íntegra en cada operación.
4. **Muy pocas operaciones y sesgo de la IA.** Las condiciones de entrada exigen coincidencias simultáneas raras (7–11 trades en años de datos), lo que hace las métricas estadísticamente inútiles. Además el prompt/esquema de la IA empuja siempre a "Mean Reversion" y a veces omite `atr_multiplier`.

## Qué voy a cambiar

**1. Calibrar los instrumentos (`src/lib/market-symbols.ts`)**
- Definir por instrumento el `pointValue` real del contrato y un factor de conversión del proxy, de forma que el P&L quede en dólares realistas por contrato (MNQ ≈ 2 $/punto, ES ≈ 50 $, CL ≈ 1.000 $/1 $, BTC ≈ 1 $/punto en micro).
- `tickSize` pasa a ser el tick real del proxy y el P&L se calcula como `puntos × pointValue × contratos`, no como ticks redondeados (el redondeo actual también pierde precisión en BTC).

**2. Reescribir la lógica de salida por estilo (`src/lib/backtest-engine.server.ts`)**
- *Mean Reversion*: salida al tocar la media (EMA 21), stop por ATR, objetivo ≈ 1R y **time stop** (máx. N barras en posición).
- *Breakout / Momentum*: stop por ATR y **trailing stop** por ATR una vez alcanzado 1R.
- *Trend Following*: salida por cruce inverso de EMAs + trailing por ATR, sin objetivo fijo.

**3. Dimensionado y entradas realistas**
- Stop = `ATR × atrMultiplier` (sin el factor 0,35 arbitrario), con `stopTicks` como suelo mínimo.
- Entrada en la **apertura de la barra siguiente** a la señal (elimina el sesgo de ejecutar al cierre de la barra que genera la señal).
- Relajar las condiciones de entrada (banda 1,0σ, cruce de RSI en las 2 últimas barras, RVOL > 1,1) para obtener un número de operaciones estadísticamente utilizable, y añadir filtro de tendencia (EMA 200) para no revertir contra tendencias fuertes.

**4. Honestidad en la interfaz (`src/components/BacktestAnalyzer.tsx`)**
- Aviso cuando el backtest produce menos de 30 operaciones: "muestra insuficiente, resultados no concluyentes".
- Mostrar el valor por punto del contrato usado, junto a la procedencia de los datos que ya se muestra.

**5. Prompt de la IA (`src/lib/ai.functions.ts`)**
- Instruir al modelo para elegir el estilo según la idea del trader (no por defecto reversión), exigir siempre `atr_multiplier` y coherencia entre stop/objetivo y el estilo.

## Verificación antes de cerrar

Ejecutaré backtests reales sobre los 5 instrumentos y los 3 estilos y comprobaré que: el número de operaciones es razonable (decenas–cientos según timeframe), el P&L está en escala de dólares creíble para el contrato, y los resultados varían por estilo/instrumento en vez de perder siempre. No prometo estrategias ganadoras — el objetivo es que el motor sea correcto y los números creíbles; una estrategia mala debe verse mala por su edge, no por un bug.

## Nota técnica

No se toca el esquema de base de datos. Los backtests ya guardados quedan con métricas de la calibración vieja; puedo añadir una limpieza de `advanced_backtests` si prefieres partir de cero.
