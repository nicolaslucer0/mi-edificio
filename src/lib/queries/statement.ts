import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  expenses,
  paymentClaims,
  unitCredits,
  units,
  type expenseStatusEnum,
  type expenseTypeEnum,
} from "@/lib/db/schema";
import type { CurrentUser } from "@/lib/session";
import { formatPeriod, isFuturePeriod } from "@/lib/format";
import {
  claimInformedCents,
  claimValidatedCents,
  remainingCents,
} from "@/lib/payments";
import { buildExpenseAccessCondition, getPendingClaimCents } from "./expenses";

export type StatementMovement = {
  id: string;
  kind: "cargo" | "pago";
  date: Date;
  concept: string;
  amountCents: number;
  status?: (typeof expenseStatusEnum.enumValues)[number];
  period?: string;
  /** Pago que avisó el vecino y el admin todavía no validó. */
  pending?: boolean;
};

export type UnitStatement = {
  unitId: string;
  unitLabel: string;
  balanceCents: number;
  /** Lo avisado que está en revisión. Ya está descontado de `balanceCents`. */
  pendingCents: number;
  movements: StatementMovement[];
};

function expenseName(
  period: string,
  type: (typeof expenseTypeEnum.enumValues)[number],
): string {
  return `${formatPeriod(period)}${
    type === "extraordinaria" ? " · Extraordinaria" : ""
  }`;
}

/**
 * Bank-statement-style ledger per unit the user holds in the given consorcio:
 * charges (expenses) and credits (payments, credit applied), most recent
 * first. The outstanding balance is the same number the home shows: what is
 * left of each due expense, minus what the vecino reported and is pending.
 */
export async function getAccountStatement(
  user: CurrentUser,
  consorcioId: string | null,
): Promise<UnitStatement[]> {
  if (!consorcioId) return [];

  const unitIds = Array.from(
    new Set(
      user.memberships
        .filter((m) => m.consorcioId === consorcioId && m.unitId !== null)
        .map((m) => m.unitId as string),
    ),
  );
  // Las mismas expensas que ve en Expensas: al inquilino no se le muestran
  // ni se le suman las extraordinarias.
  const access = buildExpenseAccessCondition(user, consorcioId);
  if (unitIds.length === 0 || !access) return [];

  const [unitRows, expenseRows, claimRows, creditRows] = await Promise.all([
    db
      .select({ id: units.id, label: units.label })
      .from(units)
      .where(inArray(units.id, unitIds)),
    db
      .select({
        id: expenses.id,
        unitId: expenses.unitId,
        period: expenses.period,
        dueDate: expenses.dueDate,
        amountCents: expenses.amountCents,
        paidCents: expenses.paidCents,
        type: expenses.type,
        status: expenses.status,
      })
      .from(expenses)
      .where(access),
    db
      .select({
        id: paymentClaims.id,
        unitId: expenses.unitId,
        period: expenses.period,
        type: expenses.type,
        expenseAmountCents: expenses.amountCents,
        amountCents: paymentClaims.amountCents,
        confirmedAmountCents: paymentClaims.confirmedAmountCents,
        resolution: paymentClaims.resolution,
        claimedAt: paymentClaims.claimedAt,
        resolvedAt: paymentClaims.resolvedAt,
      })
      .from(paymentClaims)
      .innerJoin(expenses, eq(expenses.id, paymentClaims.expenseId))
      .where(
        and(
          access,
          inArray(paymentClaims.resolution, ["approved", "pending"]),
        ),
      ),
    // Lo que se cubrió con saldo a favor: movimientos `application` del
    // ledger (negativos al aplicar, positivos si después se devolvió).
    db
      .select({
        expenseId: expenses.id,
        unitId: expenses.unitId,
        period: expenses.period,
        type: expenses.type,
        amountCents: unitCredits.amountCents,
        createdAt: unitCredits.createdAt,
      })
      .from(unitCredits)
      .innerJoin(expenses, eq(expenses.id, unitCredits.relatedExpenseId))
      .where(and(access, eq(unitCredits.reason, "application"))),
  ]);
  const pendingByExpense = await getPendingClaimCents(expenseRows);

  const byUnit = new Map<string, UnitStatement>();
  for (const u of unitRows) {
    byUnit.set(u.id, {
      unitId: u.id,
      unitLabel: u.label,
      balanceCents: 0,
      pendingCents: 0,
      movements: [],
    });
  }

  for (const e of expenseRows) {
    const unit = byUnit.get(e.unitId);
    if (!unit) continue;
    unit.movements.push({
      id: `e-${e.id}`,
      kind: "cargo",
      date: e.dueDate,
      concept: `Expensa ${expenseName(e.period, e.type)}`,
      amountCents: e.amountCents,
      status: e.status,
      period: e.period,
    });
    // Las expensas de meses futuros se listan, pero no suman al saldo aún.
    if (isFuturePeriod(e.period)) continue;
    const remaining = remainingCents(e.amountCents, e.paidCents);
    const pending = Math.min(pendingByExpense.get(e.id) ?? 0, remaining);
    unit.pendingCents += pending;
    unit.balanceCents += remaining - pending;
  }

  for (const c of claimRows) {
    const unit = byUnit.get(c.unitId);
    if (!unit) continue;
    if (c.resolution === "pending") {
      unit.movements.push({
        id: `a-${c.id}`,
        kind: "pago",
        date: c.claimedAt,
        concept: `Avisaste un pago de ${expenseName(c.period, c.type)}`,
        amountCents: claimInformedCents(c, c.expenseAmountCents),
        status: "en_validacion",
        pending: true,
      });
      continue;
    }
    // Lo validado, no el monto de la expensa: un pago parcial figura por lo
    // que se pagó.
    const amountCents = claimValidatedCents(c, c.expenseAmountCents);
    if (amountCents <= 0) continue;
    unit.movements.push({
      id: `p-${c.id}`,
      kind: "pago",
      date: c.resolvedAt ?? c.claimedAt,
      concept: `Pago de ${expenseName(c.period, c.type)}`,
      amountCents,
    });
  }

  type CreditApplied = {
    unitId: string;
    period: string;
    type: (typeof expenseTypeEnum.enumValues)[number];
    cents: number;
    date: Date;
  };
  const creditByExpense = new Map<string, CreditApplied>();
  for (const r of creditRows) {
    const entry = creditByExpense.get(r.expenseId) ?? {
      unitId: r.unitId,
      period: r.period,
      type: r.type,
      cents: 0,
      date: r.createdAt,
    };
    entry.cents -= r.amountCents;
    if (r.createdAt < entry.date) entry.date = r.createdAt;
    creditByExpense.set(r.expenseId, entry);
  }
  for (const [expenseId, c] of creditByExpense) {
    const unit = byUnit.get(c.unitId);
    if (!unit || c.cents <= 0) continue;
    unit.movements.push({
      id: `s-${expenseId}`,
      kind: "pago",
      date: c.date,
      concept: `Pagado con saldo a favor · ${expenseName(c.period, c.type)}`,
      amountCents: c.cents,
    });
  }

  for (const unit of byUnit.values()) {
    unit.movements.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  return Array.from(byUnit.values()).sort((a, b) =>
    a.unitLabel.localeCompare(b.unitLabel),
  );
}
