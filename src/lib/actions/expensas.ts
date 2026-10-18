"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reportError } from "@/lib/observability";
import {
  creditDeposits,
  expenses,
  memberships,
  paymentClaims,
  units,
  users,
} from "@/lib/db/schema";
import { sendClaimNotification, sendDepositNotification } from "@/lib/email";
import { deleteReceipt, getReceiptFile, uploadReceipt } from "@/lib/receipts";
import { recomputeExpensePaid } from "@/lib/credits";
import {
  notifyClaimToValidate,
  notifyDepositToValidate,
} from "@/lib/notifications";
import { parseTransferDate, remainingCents } from "@/lib/payments";
import { formatUnitWithFloor } from "@/lib/format";

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
  const transferredAt = parseTransferDate(formData.get("transferredAt"));
  if (transferredAt === "invalid") {
    return {
      ok: false,
      error: "Revisá la fecha de la transferencia: no puede ser una fecha futura.",
    };
  }

  const [expense] = await db
    .select({
      id: expenses.id,
      unitId: expenses.unitId,
      unitLabel: units.label,
      unitFloor: units.floor,
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
    transferredAt,
    amountCents,
    note: note || null,
    receiptUrl,
  });

  await db
    .update(expenses)
    .set({ status: "en_validacion" })
    .where(eq(expenses.id, expenseId));

  // Con edificio o piso: con dos edificios numerados igual, "Unidad 5" no le
  // dice al admin de quién es el pago.
  const unitName = formatUnitWithFloor({
    label: expense.unitLabel,
    floor: expense.unitFloor,
  });

  try {
    await sendClaimNotification({
      consorcioId: expense.consorcioId,
      unitName,
      period: expense.period,
      amountCents,
      claimedBy: actor?.name ?? actor?.email ?? "Un vecino",
      note: note || null,
    });
  } catch (err) {
    reportError(err, { scope: "claim-notification" });
  }

  await notifyClaimToValidate({
    consorcioId: expense.consorcioId,
    unitName,
    period: expense.period,
    // Lo que informó el vecino, igual que el mail (no el total de la expensa).
    amountCents,
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
  const transferredAt = parseTransferDate(formData.get("transferredAt"));
  if (transferredAt === "invalid") {
    return {
      ok: false,
      error: "Revisá la fecha de la transferencia: no puede ser una fecha futura.",
    };
  }

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
    transferredAt,
    note: note || null,
    receiptUrl,
  });

  // Igual que un "Ya pagué": si el admin no se entera, el adelanto queda sin
  // resolver y el vecino termina informando la misma plata dos veces.
  const [context] = await db
    .select({
      unitLabel: units.label,
      unitFloor: units.floor,
      consorcioId: units.consorcioId,
      actorName: users.name,
      actorEmail: users.email,
    })
    .from(units)
    .innerJoin(users, eq(users.id, userId))
    .where(eq(units.id, unitId))
    .limit(1);
  if (context) {
    const unitName = formatUnitWithFloor({
      label: context.unitLabel,
      floor: context.unitFloor,
    });
    const requestedBy = context.actorName ?? context.actorEmail ?? "Un vecino";
    try {
      await sendDepositNotification({
        consorcioId: context.consorcioId,
        unitName,
        amountCents: rawAmount,
        requestedBy,
        note: note || null,
      });
    } catch (err) {
      reportError(err, { scope: "deposit-notification" });
    }
    await notifyDepositToValidate({
      consorcioId: context.consorcioId,
      unitName,
      amountCents: rawAmount,
      requestedBy,
    });
  }

  revalidatePath("/expensas");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/**
 * El vecino borra un aviso de pago que todavía no se validó ("me
 * equivoqué"). Solo quien lo avisó, y solo mientras esté pendiente: un aviso
 * duplicado o con el monto mal lo puede limpiar él, sin que lo tenga que
 * rechazar el admin.
 */
export async function cancelClaim(claimId: string): Promise<ClaimResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "No tenés sesión activa." };
  }

  const [claim] = await db
    .select({
      expenseId: paymentClaims.expenseId,
      claimedByUserId: paymentClaims.claimedByUserId,
      resolution: paymentClaims.resolution,
      receiptUrl: paymentClaims.receiptUrl,
    })
    .from(paymentClaims)
    .where(eq(paymentClaims.id, claimId))
    .limit(1);
  if (!claim || claim.claimedByUserId !== session.user.id) {
    return { ok: false, error: "No encontramos ese aviso." };
  }
  if (claim.resolution !== "pending") {
    return {
      ok: false,
      error: "El administrador ya lo revisó, así que no se puede borrar.",
    };
  }

  await db
    .delete(paymentClaims)
    .where(
      and(
        eq(paymentClaims.id, claimId),
        eq(paymentClaims.resolution, "pending"),
      ),
    );
  await deleteReceipt(claim.receiptUrl);
  // La expensa vuelve a como estaba antes del aviso (pendiente, parcial o
  // rechazada).
  await recomputeExpensePaid(claim.expenseId);

  revalidatePath("/expensas");
  revalidatePath("/");
  revalidatePath("/admin", "layout");
  return { ok: true };
}
