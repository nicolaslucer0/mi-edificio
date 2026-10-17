import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
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

/**
 * Las escrituras para que una expensa no quede con más pagado que `keepCents`,
 * pasando el excedente a saldo a favor de la unidad: primero el crédito que se
 * le había aplicado y, si no alcanza, lo validado en sus pagos (el más nuevo
 * primero), igual que un sobrepago al aprobar. La plata no desaparece, cambia
 * de lugar.
 *
 * No ejecuta nada: el llamador las manda en el mismo `db.batch` que el cambio
 * que las origina (bajar el monto, borrar la expensa), así pasan todas o
 * ninguna. Después hay que correr `recomputeExpensePaid` si la expensa sigue
 * existiendo, y `applyCreditToUnit`.
 */
export async function excessToCreditWrites(params: {
  expenseId: string;
  unitId: string;
  /** Monto de la expensa antes del cambio. */
  amountCents: number;
  keepCents: number;
  userId: string;
}): Promise<{ writes: BatchItem<"pg">[]; refundedCents: number }> {
  const [claims, [creditRow]] = await Promise.all([
    db
      .select({
        id: paymentClaims.id,
        amountCents: paymentClaims.amountCents,
        confirmedAmountCents: paymentClaims.confirmedAmountCents,
      })
      .from(paymentClaims)
      .where(
        and(
          eq(paymentClaims.expenseId, params.expenseId),
          eq(paymentClaims.resolution, "approved"),
        ),
      )
      .orderBy(desc(paymentClaims.resolvedAt)),
    db
      .select({
        applied: sql<number>`coalesce(sum(${unitCredits.amountCents}), 0)::int`,
      })
      .from(unitCredits)
      .where(
        and(
          eq(unitCredits.relatedExpenseId, params.expenseId),
          eq(unitCredits.reason, "application"),
        ),
      ),
  ]);

  const appliedCredit = -Number(creditRow?.applied ?? 0);
  const validated = claims.map((c) => ({
    id: c.id,
    cents: claimValidatedCents(c, params.amountCents),
    pinned: c.confirmedAmountCents !== null,
  }));
  const paid = validated.reduce((sum, c) => sum + c.cents, appliedCredit);
  const refundedCents = Math.max(0, paid - params.keepCents);
  let excess = refundedCents;
  const writes: BatchItem<"pg">[] = [];

  // Una aplicación positiva "desaplica" crédito: vuelve al saldo de la unidad
  // y deja de contar como pagado en esta expensa.
  const fromCredit = Math.min(excess, appliedCredit);
  if (fromCredit > 0) {
    writes.push(
      db.insert(unitCredits).values({
        unitId: params.unitId,
        amountCents: fromCredit,
        reason: "application",
        relatedExpenseId: params.expenseId,
        createdByUserId: params.userId,
      }),
    );
    excess -= fromCredit;
  }

  for (const c of validated) {
    const take = Math.min(excess, c.cents);
    // Un claim legacy sin monto vale "la expensa entera": se le fija el valor
    // para que no cambie solo cuando cambia el monto de la expensa.
    if (take > 0 || !c.pinned) {
      writes.push(
        db
          .update(paymentClaims)
          .set({ confirmedAmountCents: c.cents - take })
          .where(eq(paymentClaims.id, c.id)),
      );
    }
    if (take > 0) {
      writes.push(
        db.insert(unitCredits).values({
          unitId: params.unitId,
          amountCents: take,
          reason: "overpayment",
          relatedClaimId: c.id,
          createdByUserId: params.userId,
        }),
      );
      excess -= take;
    }
  }

  return { writes, refundedCents };
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
