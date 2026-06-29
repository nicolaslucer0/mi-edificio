import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  expenses,
  paymentClaims,
  units,
  type expenseStatusEnum,
} from "@/lib/db/schema";
import type { CurrentUser } from "@/lib/session";
import { formatPeriod, isFuturePeriod } from "@/lib/format";

export type StatementMovement = {
  id: string;
  kind: "cargo" | "pago";
  date: Date;
  concept: string;
  amountCents: number;
  status?: (typeof expenseStatusEnum.enumValues)[number];
  period?: string;
};

export type UnitStatement = {
  unitId: string;
  unitLabel: string;
  balanceCents: number;
  movements: StatementMovement[];
};

/**
 * Bank-statement-style ledger per unit the user holds in the given consorcio:
 * charges (expenses) and credits (approved payments), most recent first, plus
 * the outstanding balance (sum of expenses not yet marked `pagado`).
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
  if (unitIds.length === 0) return [];

  const [unitRows, expenseRows, paymentRows] = await Promise.all([
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
        type: expenses.type,
        status: expenses.status,
      })
      .from(expenses)
      .where(inArray(expenses.unitId, unitIds)),
    db
      .select({
        id: paymentClaims.id,
        unitId: expenses.unitId,
        period: expenses.period,
        amountCents: expenses.amountCents,
        resolvedAt: paymentClaims.resolvedAt,
      })
      .from(paymentClaims)
      .innerJoin(expenses, eq(expenses.id, paymentClaims.expenseId))
      .where(
        and(
          inArray(expenses.unitId, unitIds),
          eq(paymentClaims.resolution, "approved"),
        ),
      ),
  ]);

  const byUnit = new Map<string, UnitStatement>();
  for (const u of unitRows) {
    byUnit.set(u.id, {
      unitId: u.id,
      unitLabel: u.label,
      balanceCents: 0,
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
      concept: `Expensa ${formatPeriod(e.period)}${
        e.type === "extraordinaria" ? " · Extraordinaria" : ""
      }`,
      amountCents: e.amountCents,
      status: e.status,
      period: e.period,
    });
    // Las expensas de meses futuros se listan, pero no suman al saldo aún.
    if (e.status !== "pagado" && !isFuturePeriod(e.period)) {
      unit.balanceCents += e.amountCents;
    }
  }

  for (const p of paymentRows) {
    const unit = byUnit.get(p.unitId);
    if (!unit) continue;
    unit.movements.push({
      id: `p-${p.id}`,
      kind: "pago",
      date: p.resolvedAt ?? new Date(),
      concept: `Pago de ${formatPeriod(p.period)}`,
      amountCents: p.amountCents,
    });
  }

  for (const unit of byUnit.values()) {
    unit.movements.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  return Array.from(byUnit.values()).sort((a, b) =>
    a.unitLabel.localeCompare(b.unitLabel),
  );
}
