import "server-only";
import { cache } from "react";
import { and, eq, inArray, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { currentPeriod } from "@/lib/format";
import {
  consorcios,
  expenses,
  paymentClaims,
  units,
  type debtVisibilityEnum,
} from "@/lib/db/schema";
import type { CurrentUser } from "@/lib/session";
import { getViewableConsorcioIds } from "./expenditures";
import { getAccessibleConsorcioIds } from "./admin";

export type DebtVisibility = (typeof debtVisibilityEnum.enumValues)[number];

export type DebtBoardConfig = {
  visibility: DebtVisibility;
  graceDays: number;
  onHome: boolean;
};

export type DebtBoardUnit = {
  unitId: string;
  label: string;
  floor: string | null;
  amountCents: number;
  /** Expensas vencidas que componen la deuda. */
  overdueCount: number;
  /** Una de las unidades del que está mirando. */
  isMine: boolean;
};

export type DebtBoard = {
  /** Unidades del consorcio con expensas ya emitidas. */
  totalUnits: number;
  upToDateUnits: number;
  overdueTotalCents: number;
  /** Vacío cuando la visibilidad es `resumen`. */
  units: DebtBoardUnit[];
};

const DAY_MS = 86_400_000;

export const getDebtBoardConfig = cache(async function getDebtBoardConfig(
  consorcioId: string,
): Promise<DebtBoardConfig | null> {
  const [row] = await db
    .select({
      visibility: consorcios.debtVisibility,
      graceDays: consorcios.debtGraceDays,
      onHome: consorcios.debtOnHome,
    })
    .from(consorcios)
    .where(eq(consorcios.id, consorcioId))
    .limit(1);
  return row ?? null;
});

/**
 * Deuda vencida por unidad del consorcio, con el detalle completo. No chequea
 * permisos ni visibilidad: eso lo hacen las funciones exportadas.
 *
 * Una unidad figura cuando le quedan expensas ya emitidas, impagas y con el
 * vencimiento pasado hace más de `graceDays`. Se descuenta lo pagado, los pagos
 * informados que el admin todavía no validó (mismo criterio optimista que el
 * home) y el saldo a favor de la unidad.
 */
async function buildDebtBoard(
  consorcioId: string,
  graceDays: number,
  myUnitIds: ReadonlySet<string>,
): Promise<DebtBoard> {
  // Una sola pasada por las expensas ya emitidas: de acá salen tanto el
  // denominador (unidades facturadas) como la deuda de cada una.
  const rows = await db
    .select({
      unitId: units.id,
      label: units.label,
      floor: units.floor,
      creditCents: units.creditCents,
      expenseId: expenses.id,
      amountCents: expenses.amountCents,
      paidCents: expenses.paidCents,
      status: expenses.status,
      dueDate: expenses.dueDate,
    })
    .from(expenses)
    .innerJoin(units, eq(units.id, expenses.unitId))
    .where(
      and(
        eq(units.consorcioId, consorcioId),
        lte(expenses.period, currentPeriod()),
      ),
    )
    .orderBy(units.floor, units.label);

  if (rows.length === 0) {
    return { totalUnits: 0, upToDateUnits: 0, overdueTotalCents: 0, units: [] };
  }

  const unpaidIds = rows
    .filter((r) => r.status !== "pagado")
    .map((r) => r.expenseId);
  const pending = unpaidIds.length
    ? await db
        .select({
          expenseId: paymentClaims.expenseId,
          amountCents: paymentClaims.amountCents,
        })
        .from(paymentClaims)
        .where(
          and(
            inArray(paymentClaims.expenseId, unpaidIds),
            eq(paymentClaims.resolution, "pending"),
          ),
        )
    : [];

  const amountById = new Map(rows.map((r) => [r.expenseId, r.amountCents]));
  const pendingByExpense = new Map<string, number>();
  for (const p of pending) {
    // Claims viejos (previos a pagos parciales) informan la expensa completa.
    const informed = p.amountCents ?? amountById.get(p.expenseId) ?? 0;
    pendingByExpense.set(
      p.expenseId,
      (pendingByExpense.get(p.expenseId) ?? 0) + informed,
    );
  }

  const overdueBefore = Date.now() - graceDays * DAY_MS;

  type Accumulated = {
    unitId: string;
    label: string;
    floor: string | null;
    creditCents: number;
    owedCents: number;
    overdueCount: number;
  };
  const byUnit = new Map<string, Accumulated>();

  for (const r of rows) {
    let unit = byUnit.get(r.unitId);
    if (!unit) {
      unit = {
        unitId: r.unitId,
        label: r.label,
        floor: r.floor,
        creditCents: r.creditCents,
        owedCents: 0,
        overdueCount: 0,
      };
      byUnit.set(r.unitId, unit);
    }

    if (r.status === "pagado") continue;
    // Todavía dentro del período de gracia: no es mora.
    if (r.dueDate.getTime() >= overdueBefore) continue;

    const owed = Math.max(
      0,
      r.amountCents - r.paidCents - (pendingByExpense.get(r.expenseId) ?? 0),
    );
    if (owed <= 0) continue;
    unit.owedCents += owed;
    unit.overdueCount += 1;
  }

  const debtors: DebtBoardUnit[] = [];
  let overdueTotalCents = 0;
  for (const unit of byUnit.values()) {
    // El saldo a favor ya se aplica solo a las deudas (ver lib/credits.ts);
    // restarlo acá es defensivo, para el borde en que convivan.
    const amountCents = Math.max(0, unit.owedCents - unit.creditCents);
    if (amountCents <= 0) continue;
    overdueTotalCents += amountCents;
    debtors.push({
      unitId: unit.unitId,
      label: unit.label,
      floor: unit.floor,
      amountCents,
      overdueCount: unit.overdueCount,
      isMine: myUnitIds.has(unit.unitId),
    });
  }

  return {
    totalUnits: byUnit.size,
    upToDateUnits: byUnit.size - debtors.length,
    overdueTotalCents,
    units: debtors,
  };
}

function myUnitIdsOf(user: CurrentUser): ReadonlySet<string> {
  return new Set(
    user.memberships
      .filter((m) => m.unitId !== null)
      .map((m) => m.unitId as string),
  );
}

/**
 * El estado de pagos tal como lo ve un vecino del consorcio. `null` cuando la
 * visibilidad está apagada o el usuario no pertenece al consorcio.
 */
export const getDebtBoard = cache(async function getDebtBoard(
  user: CurrentUser,
  consorcioId: string | null,
): Promise<(DebtBoard & DebtBoardConfig) | null> {
  if (!consorcioId) return null;

  const viewable = getViewableConsorcioIds(user);
  if (viewable !== "all" && !viewable.includes(consorcioId)) return null;

  const config = await getDebtBoardConfig(consorcioId);
  if (!config || config.visibility === "off") return null;

  const board = await buildDebtBoard(
    consorcioId,
    config.graceDays,
    myUnitIdsOf(user),
  );
  return {
    ...config,
    ...board,
    // En `resumen` el detalle no sale del servidor.
    units: config.visibility === "por_unidad" ? board.units : [],
  };
});

/**
 * El detalle completo para la pantalla de configuración del admin, sin importar
 * la visibilidad guardada: es lo que le permite ver qué expone cada nivel antes
 * de elegir uno.
 */
export async function getDebtBoardPreview(
  user: CurrentUser,
  consorcioId: string,
  graceDays: number,
): Promise<DebtBoard | null> {
  const ids = getAccessibleConsorcioIds(user);
  if (ids !== "all" && !ids.includes(consorcioId)) return null;
  return buildDebtBoard(consorcioId, graceDays, myUnitIdsOf(user));
}
