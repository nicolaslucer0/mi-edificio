"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  expenses,
  memberships,
  paymentClaims,
  units,
  users,
} from "@/lib/db/schema";
import { sendClaimNotification } from "@/lib/email";
import { getReceiptFile, uploadReceipt } from "@/lib/receipts";
import { notifyClaimToValidate } from "@/lib/notifications";

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

  const [expense] = await db
    .select({
      id: expenses.id,
      unitId: expenses.unitId,
      unitLabel: units.label,
      consorcioId: units.consorcioId,
      period: expenses.period,
      amountCents: expenses.amountCents,
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

  if (expense.status !== "pendiente" && expense.status !== "rechazado") {
    return {
      ok: false,
      error: "Esta expensa ya no se puede marcar como pagada en su estado actual.",
    };
  }

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
      amountCents: expense.amountCents,
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
