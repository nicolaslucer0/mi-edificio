import "server-only";
import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { consorcios, units } from "@/lib/db/schema";
import type { CurrentUser } from "@/lib/session";

export type PaymentInfo = {
  consorcioId: string;
  consorcioName: string;
  alias: string | null;
  cbu: string | null;
  holderName: string | null;
  /** Las unidades del vecino en el consorcio, para armar el concepto. */
  units: { label: string; floor: string | null }[];
};

export async function getPaymentInfoForUser(
  user: CurrentUser,
  consorcioId?: string | null,
): Promise<PaymentInfo[]> {
  const memberIds = Array.from(
    new Set(
      user.memberships
        .filter((m) => m.consorcioId !== null)
        .map((m) => m.consorcioId as string),
    ),
  );

  // Scope to the selected consorcio when it's one the user belongs to.
  const consorcioIds = consorcioId
    ? memberIds.filter((id) => id === consorcioId)
    : memberIds;

  if (consorcioIds.length === 0) return [];

  const unitIds = Array.from(
    new Set(
      user.memberships
        .filter((m) => m.unitId !== null)
        .map((m) => m.unitId as string),
    ),
  );

  const [rows, unitRows] = await Promise.all([
    db
      .select({
        id: consorcios.id,
        name: consorcios.name,
        paymentAlias: consorcios.paymentAlias,
        paymentCbu: consorcios.paymentCbu,
        paymentHolderName: consorcios.paymentHolderName,
      })
      .from(consorcios)
      .where(inArray(consorcios.id, consorcioIds)),
    unitIds.length === 0
      ? Promise.resolve([])
      : db
          .select({
            consorcioId: units.consorcioId,
            label: units.label,
            floor: units.floor,
          })
          .from(units)
          .where(inArray(units.id, unitIds))
          .orderBy(units.floor, units.label),
  ]);

  return rows.map((r) => ({
    consorcioId: r.id,
    consorcioName: r.name,
    alias: r.paymentAlias,
    cbu: r.paymentCbu,
    holderName: r.paymentHolderName,
    units: unitRows
      .filter((u) => u.consorcioId === r.id)
      .map((u) => ({ label: u.label, floor: u.floor })),
  }));
}
