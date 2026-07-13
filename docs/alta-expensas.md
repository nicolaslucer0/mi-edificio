# Diseño: asistente de alta de expensas + coeficiente por unidad

Estado: **propuesta** (pre-desarrollo). Fecha: 2026-07-13.

## Problema

Hoy el alta de expensa pide un "destino" (una unidad o todo el consorcio) y un
monto. Para el consorcio, aplica **el mismo monto a cada depto**. Falta poder
**repartir un monto total** entre los deptos, y el flujo no guía bien la
decisión. Queremos un mini-asistente y, de paso, un **coeficiente por unidad**
para repartir proporcional el día de mañana.

## Decisiones tomadas

- Alta como **asistente**: primero tipo, después cómo se calcula el monto.
- Se agrega **`coefficient` por unidad** (opcional).
- Al **repartir un total**: si **ninguna** unidad tiene coeficiente cargado →
  **partes iguales**. Si están cargados → **proporcional al coeficiente**.

## Flujo del asistente

1. **Tipo:** Ordinaria / Extraordinaria.
2. **Cómo se cobra:**
   - **Monto fijo para cada depto** — cada unidad paga lo mismo (comportamiento
     actual del alcance "consorcio").
   - **Repartir un total entre los deptos** — entrás el total y el sistema lo
     divide (igual o por coeficiente). Muestra un preview ("≈ $X por depto", o
     "según coeficiente").
   - **Cobrar a un depto puntual** — elegís la unidad y el monto (caso actual de
     alcance "unidad": multa, extraordinaria individual, etc.).
3. Período, vencimiento, descripción (como hoy).

En los tres casos se sigue creando **una expensa por unidad**, con dedupe por
(unidad, período, tipo) como ahora.

## Regla de reparto de un total

- **Pesos:** `pesoᵢ = 1` (partes iguales) o `pesoᵢ = coeficienteᵢ` (si **todas**
  las unidades destino tienen coeficiente > 0). Si a alguna le falta → partes
  iguales (evita repartos raros).
- **Reparto exacto en centavos:** método de **resto mayor** — se calcula la parte
  de cada unidad, se redondea para abajo, y los centavos sobrantes se asignan a
  las unidades con mayor resto. Garantiza que la suma dé **exactamente** el total.

## Modelo de datos

- **`units.coefficient`** (`numeric(5,2)`, nullable) — porcentaje con 2 decimales
  guardado tal cual (ej. `10.30`, `3.45`). Nullable = sin cargar. No necesita
  sumar 100; es un peso relativo. (Drizzle lo devuelve como string → `Number()`
  para el cálculo.)

## UI

- **Alta de expensa** (`admin/[consorcioId]/expensas/nueva`): el form pasa a ser
  el asistente (tipo → modo → campos). El preview del reparto ayuda a confirmar.
- **Unidades** (`create-unit-form` + edición): campo opcional **"Coeficiente
  (%)"**. Si está vacío en todas, el reparto es igual.
- (Opcional) Mostrar el coeficiente en el listado de unidades.

## Backend

- `createExpense` acepta un **`mode`** (`fixed` | `split` | `single`) + los
  campos según el modo (monto fijo, total, o unidad+monto), y computa el monto
  por unidad. El resto (validación, dedupe, notificación, auto-aplicación de
  saldo a favor) queda igual.
- Nuevo helper puro `splitAmount(totalCents, weights): number[]` (resto mayor),
  testeable.
- CRUD de unidad acepta/actualiza `coefficient`.

## Decisiones cerradas

1. **Formato del coeficiente:** porcentaje con 2 decimales, guardado tal cual
   (`numeric(5,2)`, ej. `10.30`).
2. **Coeficientes parciales:** si a **cualquier** unidad le falta el coeficiente,
   el reparto es **en partes iguales** (no se mezcla).

## Impacto en archivos (estimado)

- `db/schema.ts` — `units.coefficient` + migración (`db:push`).
- `lib/expenses-split.ts` (nuevo) — `splitAmount` (resto mayor).
- `lib/actions/admin.ts` — `createExpense` con modos; CRUD de unidad con
  coeficiente.
- `expensas/nueva/expense-form.tsx` — asistente (tipo → modo → campos + preview).
- `unidades/create-unit-form.tsx` (+ edición) — campo coeficiente.
- Query de unidades — exponer `coefficient`.
