import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { expenses, paymentClaims, unitCredits, units } from "@/lib/db/schema";
import {
  claimValidatedCents,
  computeExpenseStatus,
  remainingCents,
} from "@/lib/payments";

// Estados con saldo pendiente. Se saltea `en_validacion` (hay un pago en curso)
// y `pagado`. Orden de aplicación del crédito: vencimiento más viejo primero.
const OWED_STATUSES = ["pendiente", "parcial", "rechazado"] as const;

/**
 * Recalcula `paidCents` y el estado de una expensa. `paidCents` = suma de los
 * claims aprobados + el crédito a favor aplicado a la expensa. Fuente de verdad
 * unificada; la llaman tanto el flujo de pagos como el motor de crédito.
 */
export async function recomputeExpensePaid(expenseId: string): Promise<void> {
  const [expense] = await db
    .select({ amountCents: expenses.amountCents })
    .from(expenses)
    .where(eq(expenses.id, expenseId))
    .limit(1);
  if (!expense) return;

  const claims = await db
    .select({
      resolution: paymentClaims.resolution,
      amountCents: paymentClaims.amountCents,
      confirmedAmountCents: paymentClaims.confirmedAmountCents,
    })
    .from(paymentClaims)
    .where(eq(paymentClaims.expenseId, expenseId));

  let paidCents = 0;
  let hasPendingClaim = false;
  let hasRejectedClaim = false;
  for (const c of claims) {
    if (c.resolution === "approved") {
      paidCents += claimValidatedCents(c, expense.amountCents);
    } else if (c.resolution === "pending") {
      hasPendingClaim = true;
    } else if (c.resolution === "rejected") {
      hasRejectedClaim = true;
    }
  }

  // Crédito aplicado a esta expensa: movimientos negativos del ledger.
  const [creditRow] = await db
    .select({
      applied: sql<number>`coalesce(sum(${unitCredits.amountCents}), 0)::int`,
    })
    .from(unitCredits)
    .where(
      and(
        eq(unitCredits.relatedExpenseId, expenseId),
        eq(unitCredits.reason, "application"),
      ),
    );
  paidCents += -Number(creditRow?.applied ?? 0);

  const status = computeExpenseStatus({
    amountCents: expense.amountCents,
    paidCents,
    hasPendingClaim,
    hasRejectedClaim,
  });
  await db
    .update(expenses)
    .set({ paidCents, status })
    .where(eq(expenses.id, expenseId));
}

/** Recalcula el balance de saldo de la unidad desde el ledger y lo cachea. */
export async function recomputeUnitCredit(unitId: string): Promise<number> {
  const [row] = await db
    .select({
      balance: sql<number>`coalesce(sum(${unitCredits.amountCents}), 0)::int`,
    })
    .from(unitCredits)
    .where(eq(unitCredits.unitId, unitId));
  const balance = Number(row?.balance ?? 0);
  await db
    .update(units)
    .set({ creditCents: balance })
    .where(eq(units.id, unitId));
  return balance;
}

/**
 * Aplica el saldo a favor de la unidad a sus expensas adeudadas (más vieja
 * primero), hasta agotar el crédito o las deudas. Cada aplicación es un
 * movimiento negativo del ledger. Idempotente: si no hay crédito o deudas, no
 * hace nada. La llaman los flujos que crean crédito y la creación de expensas.
 */
export async function applyCreditToUnit(unitId: string): Promise<void> {
  let balance = await recomputeUnitCredit(unitId);
  if (balance <= 0) return;

  const owed = await db
    .select({
      id: expenses.id,
      amountCents: expenses.amountCents,
      paidCents: expenses.paidCents,
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.unitId, unitId),
        inArray(expenses.status, [...OWED_STATUSES]),
      ),
    )
    .orderBy(asc(expenses.dueDate));

  for (const e of owed) {
    if (balance <= 0) break;
    const rem = remainingCents(e.amountCents, e.paidCents);
    if (rem <= 0) continue;
    const apply = Math.min(balance, rem);
    await db.insert(unitCredits).values({
      unitId,
      amountCents: -apply,
      reason: "application",
      relatedExpenseId: e.id,
    });
    await recomputeExpensePaid(e.id);
    balance -= apply;
  }

  await recomputeUnitCredit(unitId);
}
