"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  creditDeposits,
  expenses,
  memberships,
  paymentClaims,
  units,
  users,
} from "@/lib/db/schema";
import { sendClaimNotification } from "@/lib/email";
import { getReceiptFile, uploadReceipt } from "@/lib/receipts";
import { notifyClaimToValidate } from "@/lib/notifications";
import { remainingCents } from "@/lib/payments";

export type ClaimResult = { ok: true } | { ok: false; error: string };

export async function claimPayment(
  expenseId: string,
  formData: FormData,
): Promise<ClaimResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "No tenés sesión activa." };
  }
  const userId = session.user.id;
  const note = (formData.get("note")?.toString() ?? "").trim();
  const rawAmount = Number.parseInt(
    formData.get("amountCents")?.toString() ?? "",
    10,
  );
  const requestedCents =
    Number.isFinite(rawAmount) && rawAmount > 0 ? rawAmount : null;

  const [expense] = await db
    .select({
      id: expenses.id,
      unitId: expenses.unitId,
      unitLabel: units.label,
      consorcioId: units.consorcioId,
      period: expenses.period,
      amountCents: expenses.amountCents,
      paidCents: expenses.paidCents,
      status: expenses.status,
    })
    .from(expenses)
    .innerJoin(units, eq(units.id, expenses.unitId))
    .where(eq(expenses.id, expenseId))
    .limit(1);

  if (!expense) {
    return { ok: false, error: "No encontramos esa expensa." };
  }

  const userMembership = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.unitId, expense.unitId),
      ),
    )
    .limit(1);
  if (userMembership.length === 0) {
    return { ok: false, error: "No tenés acceso a esa unidad." };
  }

  if (expense.status === "en_validacion") {
    return {
      ok: false,
      error: "Ya tenés un pago en validación para esta expensa.",
    };
  }
  if (expense.status === "pagado") {
    return { ok: false, error: "Esta expensa ya está paga." };
  }

  const remaining = remainingCents(expense.amountCents, expense.paidCents);
  if (remaining <= 0) {
    return { ok: false, error: "Esta expensa ya está saldada." };
  }
  // Se capa al saldo restante: no se puede informar de más (v1).
  const amountCents = Math.min(requestedCents ?? remaining, remaining);

  const [actor] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  let receiptUrl: string | null = null;
  const file = getReceiptFile(formData);
  if (file) {
    const upload = await uploadReceipt(file);
    if (!upload.ok) return { ok: false, error: upload.error };
    receiptUrl = upload.url;
  }

  await db.insert(paymentClaims).values({
    expenseId,
    claimedByUserId: userId,
    amountCents,
    note: note || null,
    receiptUrl,
  });

  await db
    .update(expenses)
    .set({ status: "en_validacion" })
    .where(eq(expenses.id, expenseId));

  try {
    await sendClaimNotification({
      consorcioId: expense.consorcioId,
      unitLabel: expense.unitLabel,
      period: expense.period,
      amountCents,
      claimedBy: actor?.name ?? actor?.email ?? "Un vecino",
      note: note || null,
    });
  } catch (err) {
    console.error("Failed to send claim notification:", err);
  }

  await notifyClaimToValidate({
    consorcioId: expense.consorcioId,
    unitLabel: expense.unitLabel,
    period: expense.period,
    amountCents: expense.amountCents,
    claimedBy: actor?.name ?? actor?.email ?? "Un vecino",
  });

  revalidatePath("/expensas");
  revalidatePath("/");

  return { ok: true };
}

/**
 * Un vecino informa un adelanto de saldo a favor (sin expensa puntual). Queda
 * pendiente hasta que el admin lo valide; recién ahí se acredita a la unidad.
 */
export async function requestCreditDeposit(
  unitId: string,
  formData: FormData,
): Promise<ClaimResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "No tenés sesión activa." };
  }
  const userId = session.user.id;

  const membership = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.unitId, unitId)))
    .limit(1);
  if (membership.length === 0) {
    return { ok: false, error: "No tenés acceso a esa unidad." };
  }

  const rawAmount = Number.parseInt(
    formData.get("amountCents")?.toString() ?? "",
    10,
  );
  if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
    return { ok: false, error: "Ingresá un monto válido." };
  }
  const note = (formData.get("note")?.toString() ?? "").trim();

  let receiptUrl: string | null = null;
  const file = getReceiptFile(formData);
  if (file) {
    const upload = await uploadReceipt(file);
    if (!upload.ok) return { ok: false, error: upload.error };
    receiptUrl = upload.url;
  }

  await db.insert(creditDeposits).values({
    unitId,
    requestedByUserId: userId,
    amountCents: rawAmount,
    note: note || null,
    receiptUrl,
  });

  revalidatePath("/expensas");
  return { ok: true };
}
