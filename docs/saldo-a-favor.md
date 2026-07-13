# Diseño: saldo a favor / pago adelantado

Estado: **propuesta** (pre-desarrollo). Fecha: 2026-07-13.
Continúa el trabajo de [pagos parciales](./pagos-parciales.md).

## Problema

Hoy el sobrepago está capado (`claimPayment` y `approveClaim` limitan al saldo
de la expensa). Queremos que la plata de más quede como **saldo a favor de la
unidad** y que un vecino pueda **adelantar** dinero, aplicándose solo a las
expensas.

## Decisiones tomadas

- **Generación:** por **sobrepago** de una expensa **y** por un flujo dedicado
  de **cargar saldo** (depósito adelantado sin expensa puntual).
- **Aplicación:** **automática**. El crédito se descuenta solo de las expensas
  adeudadas; el vecino no tiene que aplicarlo a mano.

## Modelo de datos

- **`unitCredits`** (ledger por unidad, fuente de verdad):
  `id, unitId, amountCents (con signo: + ingreso / − aplicación), reason
  ("overpayment" | "deposit" | "application" | "adjustment"), relatedExpenseId?,
  relatedClaimId?, createdByUserId, createdAt, note`. Balance = `sum(amountCents)`.
- **`units.creditCents`** — balance cacheado (recalculado desde el ledger tras
  cada movimiento), para lecturas rápidas. Mismo patrón que `expenses.paidCents`.
- **`creditDeposits`** (flujo de validación del adelanto, separado de
  `paymentClaims` para no tocar el flujo de pagos que ya funciona):
  `id, unitId, requestedByUserId, amountCents, receiptUrl?, note?, status
  ("pending" | "approved" | "rejected"), resolvedByUserId?, resolvedAt?,
  rejectionReason?, createdAt`.

> Se descartó reusar `paymentClaims` con `expenseId` nullable: obligaría a tocar
> todas las queries/joins de pagos (riesgo sobre lo recién hecho).

## Flujos

### Generar saldo

- **Sobrepago:** se **destapa** el cap. Si el monto validado supera el saldo de
  la expensa, se aplica el saldo a la expensa (→ `paidCents`) y el excedente se
  registra en `unitCredits` (`reason: "overpayment"`).
- **Cargar saldo (adelanto):** el vecino informa un monto (+ comprobante
  opcional) → entra a validación → el admin lo aprueba → `unitCredits`
  (`reason: "deposit"`). Aparece en la misma cola de "Aprobar pagos" del admin,
  en una sección aparte.

### Auto-aplicación (motor `applyCreditToUnit(unitId)`)

Se ejecuta tras: aprobar un depósito, generar crédito por sobrepago, y **crear
una expensa nueva**. Algoritmo:

1. Si la unidad tiene `creditCents > 0` y hay expensas adeudadas.
2. Recorre las expensas adeudadas (estado `pendiente`/`parcial`/`rechazado`,
   **salta las `en_validacion`** para no chocar con un pago en curso), ordenadas
   por vencimiento (la más vieja primero).
3. Por cada una aplica `min(crédito, saldo)` → suma a `paidCents`, registra
   `unitCredits` (`reason: "application"`, `relatedExpenseId`), y recalcula el
   estado de la expensa (reusa `computeExpenseStatus`). Sigue hasta agotar el
   crédito o las deudas.
4. El excedente que no se aplica queda como saldo disponible.

Aplicar crédito **no** pasa por el admin: es plata ya validada.

## Interacción con expensas y deuda

- Como el crédito aplicado entra por `paidCents`, una expensa cubierta por saldo
  queda `pagado`/`parcial` sin necesidad de un `paymentClaim`.
- **Deuda mostrada:** ya refleja el crédito aplicado (vía `paidCents`), así que
  el cálculo actual no cambia. Se **suma** mostrar el saldo disponible.

## UI

- **Vecino (expensas):** chip/tarjeta "Tenés $X a favor" cuando hay saldo; botón
  **"Cargar saldo"** (monto + comprobante opcional). Las expensas cubiertas por
  crédito muestran su estado normal (pagada/parcial) con una nota "cubierto con
  saldo a favor".
- **Admin (aprobar pagos):** sección "Adelantos por validar" además de los pagos;
  aprobar/rechazar como un claim.
- **Admin (reportes / unidad):** saldo a favor por unidad.
- **Sobrepago:** en la tarjeta de aprobación, permitir confirmar un monto mayor
  al saldo; avisar "genera $Y de saldo a favor".

## Decisiones abiertas (con default propuesto)

1. **Alcance de la auto-aplicación:** el default es aplicar a **deudas actuales
   primero** (vencidas/del mes, más vieja primero) y, si sobra, a **futuras** a
   medida que se crean. ¿Te sirve, o el adelanto debería tocar solo futuras?
2. **Reembolso / retiro de saldo:** ¿el vecino puede pedir que le devuelvan el
   saldo? Propuesta: **no en v1** (solo se consume en expensas).
3. **Ajuste manual del admin:** corregir saldo a mano (`reason: "adjustment"`).
   Propuesta: **v2**.

## Impacto en archivos (estimado)

- `db/schema.ts` — tablas `unitCredits`, `creditDeposits`, `units.creditCents`
  + migración.
- `lib/credits.ts` (nuevo) — motor `applyCreditToUnit` + helpers de balance.
- `actions/expensas.ts` — `claimPayment` (destapar cap → excedente a crédito),
  nueva action `requestCreditDeposit`.
- `actions/admin.ts` — `approveClaim` (excedente → crédito), nuevas
  `approveCreditDeposit` / `rejectCreditDeposit`, disparar auto-aplicación al
  crear expensa.
- `queries/expenses.ts` + `queries/admin.ts` — exponer saldo; cola de adelantos.
- UI: expensas (chip + "cargar saldo"), aprobar-pagos (sección adelantos),
  reportes (saldo por unidad).
