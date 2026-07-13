import type { expenseStatusEnum } from "@/lib/db/schema";

export type ExpenseStatus = (typeof expenseStatusEnum.enumValues)[number];

/** Saldo que falta pagar de una expensa (nunca negativo). */
export function remainingCents(amountCents: number, paidCents: number): number {
  return Math.max(0, amountCents - paidCents);
}

/**
 * Monto que un claim informa haber pagado. Los claims legacy (sin monto,
 * previos a pagos parciales) se interpretan como el total de la expensa.
 */
export function claimInformedCents(
  claim: { amountCents: number | null },
  expenseAmountCents: number,
): number {
  return claim.amountCents ?? expenseAmountCents;
}

/**
 * Monto validado de un claim aprobado: lo confirmado por el admin, o el
 * informado por el vecino, o el total de la expensa (legacy).
 */
export function claimValidatedCents(
  claim: { amountCents: number | null; confirmedAmountCents: number | null },
  expenseAmountCents: number,
): number {
  return claim.confirmedAmountCents ?? claim.amountCents ?? expenseAmountCents;
}

/**
 * Deriva el estado de una expensa a partir de cuánto se pagó y del estado de
 * sus claims. Precedencia: pagado > en validación > parcial > rechazado >
 * pendiente. Un rechazo no borra lo ya pagado.
 */
export function computeExpenseStatus(input: {
  amountCents: number;
  paidCents: number;
  hasPendingClaim: boolean;
  hasRejectedClaim: boolean;
}): ExpenseStatus {
  if (input.paidCents >= input.amountCents) return "pagado";
  if (input.hasPendingClaim) return "en_validacion";
  if (input.paidCents > 0) return "parcial";
  if (input.hasRejectedClaim) return "rechazado";
  return "pendiente";
}
