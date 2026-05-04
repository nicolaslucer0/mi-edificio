"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { put, del } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  consorcios,
  expenditures,
  expenses,
  memberships,
  paymentClaims,
  units,
  users,
} from "@/lib/db/schema";
import {
  sendPaymentConfirmedEmail,
  sendPaymentRejectedEmail,
} from "@/lib/email";

export type ActionResult = { ok: true } | { ok: false; error: string };

type AdminContext = {
  userId: string;
  isSuperAdmin: boolean;
  adminConsorcioIds: string[];
};

async function requireAdminContext(): Promise<AdminContext | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = session.user.id;

  const userMemberships = await db
    .select({ role: memberships.role, consorcioId: memberships.consorcioId })
    .from(memberships)
    .where(eq(memberships.userId, userId));

  const isSuperAdmin = userMemberships.some((m) => m.role === "super_admin");
  const isAdmin = userMemberships.some((m) => m.role === "admin");
  if (!isSuperAdmin && !isAdmin) return null;

  return {
    userId,
    isSuperAdmin,
    adminConsorcioIds: userMemberships
      .filter((m) => m.role === "admin" && m.consorcioId)
      .map((m) => m.consorcioId as string),
  };
}

function canAccessConsorcio(ctx: AdminContext, consorcioId: string): boolean {
  return ctx.isSuperAdmin || ctx.adminConsorcioIds.includes(consorcioId);
}

async function loadClaimContext(claimId: string) {
  const [row] = await db
    .select({
      claimId: paymentClaims.id,
      resolution: paymentClaims.resolution,
      expenseId: expenses.id,
      period: expenses.period,
      amountCents: expenses.amountCents,
      unitLabel: units.label,
      consorcioId: units.consorcioId,
      claimerEmail: users.email,
      claimerPrefs: users.notificationPrefs,
    })
    .from(paymentClaims)
    .innerJoin(expenses, eq(expenses.id, paymentClaims.expenseId))
    .innerJoin(units, eq(units.id, expenses.unitId))
    .innerJoin(users, eq(users.id, paymentClaims.claimedByUserId))
    .where(eq(paymentClaims.id, claimId))
    .limit(1);
  return row ?? null;
}

export async function approveClaim(claimId: string): Promise<ActionResult> {
  const ctx = await requireAdminContext();
  if (!ctx) return { ok: false, error: "Sin permisos." };

  const claim = await loadClaimContext(claimId);
  if (!claim) return { ok: false, error: "El pago no existe." };
  if (!canAccessConsorcio(ctx, claim.consorcioId)) {
    return { ok: false, error: "No tenés permisos sobre ese consorcio." };
  }
  if (claim.resolution !== "pending") {
    return { ok: false, error: "Este pago ya fue resuelto." };
  }

  await db
    .update(paymentClaims)
    .set({
      resolution: "approved",
      resolvedByUserId: ctx.userId,
      resolvedAt: new Date(),
    })
    .where(eq(paymentClaims.id, claim.claimId));

  await db
    .update(expenses)
    .set({ status: "pagado" })
    .where(eq(expenses.id, claim.expenseId));

  if (claim.claimerEmail) {
    try {
      await sendPaymentConfirmedEmail({
        to: claim.claimerEmail,
        period: claim.period,
        amountCents: claim.amountCents,
        unitLabel: claim.unitLabel,
        notificationPrefs: claim.claimerPrefs,
      });
    } catch (e) {
      console.error("Failed to send confirmation email:", e);
    }
  }

  revalidatePath("/admin");
  revalidatePath("/expensas");
  revalidatePath("/");
  return { ok: true };
}

const rejectSchema = z.object({
  claimId: z.uuid(),
  reason: z
    .string()
    .min(3, "El motivo es muy corto.")
    .max(500, "El motivo es muy largo."),
});

export async function rejectClaim(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireAdminContext();
  if (!ctx) return { ok: false, error: "Sin permisos." };

  const parsed = rejectSchema.safeParse({
    claimId: formData.get("claimId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const claim = await loadClaimContext(parsed.data.claimId);
  if (!claim) return { ok: false, error: "El pago no existe." };
  if (!canAccessConsorcio(ctx, claim.consorcioId)) {
    return { ok: false, error: "No tenés permisos sobre ese consorcio." };
  }
  if (claim.resolution !== "pending") {
    return { ok: false, error: "Este pago ya fue resuelto." };
  }

  await db
    .update(paymentClaims)
    .set({
      resolution: "rejected",
      resolvedByUserId: ctx.userId,
      resolvedAt: new Date(),
      rejectionReason: parsed.data.reason,
    })
    .where(eq(paymentClaims.id, claim.claimId));

  await db
    .update(expenses)
    .set({ status: "rechazado" })
    .where(eq(expenses.id, claim.expenseId));

  if (claim.claimerEmail) {
    try {
      await sendPaymentRejectedEmail({
        to: claim.claimerEmail,
        period: claim.period,
        amountCents: claim.amountCents,
        unitLabel: claim.unitLabel,
        reason: parsed.data.reason,
        notificationPrefs: claim.claimerPrefs,
      });
    } catch (e) {
      console.error("Failed to send rejection email:", e);
    }
  }

  revalidatePath("/admin");
  revalidatePath("/expensas");
  revalidatePath("/");
  return { ok: true };
}

const paymentInfoSchema = z.object({
  consorcioId: z.uuid(),
  paymentHolderName: z.string().min(1, "Falta el titular.").max(120),
  paymentAlias: z.string().min(6, "El alias es muy corto.").max(40),
  paymentCbu: z
    .string()
    .regex(/^\d{22}$/, { message: "El CBU/CVU debe tener 22 dígitos." }),
});

export async function updatePaymentInfo(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireAdminContext();
  if (!ctx) return { ok: false, error: "Sin permisos." };

  const parsed = paymentInfoSchema.safeParse({
    consorcioId: formData.get("consorcioId"),
    paymentHolderName: formData.get("paymentHolderName"),
    paymentAlias: formData.get("paymentAlias"),
    paymentCbu: formData.get("paymentCbu"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  if (!canAccessConsorcio(ctx, parsed.data.consorcioId)) {
    return { ok: false, error: "No tenés permisos sobre ese consorcio." };
  }

  await db
    .update(consorcios)
    .set({
      paymentHolderName: parsed.data.paymentHolderName.trim(),
      paymentAlias: parsed.data.paymentAlias.trim(),
      paymentCbu: parsed.data.paymentCbu.trim(),
    })
    .where(eq(consorcios.id, parsed.data.consorcioId));

  revalidatePath("/admin");
  revalidatePath("/admin/datos-de-pago");
  revalidatePath("/expensas");
  return { ok: true };
}

const createExpenseSchema = z.object({
  unitId: z.uuid(),
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, { message: "Formato YYYY-MM." }),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Formato YYYY-MM-DD." }),
  amountPesos: z.coerce.number().int().positive("El monto debe ser mayor a 0."),
  type: z.enum(["ordinaria", "extraordinaria"]),
  description: z.string().max(500).optional(),
});

export async function createExpense(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireAdminContext();
  if (!ctx) return { ok: false, error: "Sin permisos." };

  const parsed = createExpenseSchema.safeParse({
    unitId: formData.get("unitId"),
    period: formData.get("period"),
    dueDate: formData.get("dueDate"),
    amountPesos: formData.get("amountPesos"),
    type: formData.get("type"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const [unitRow] = await db
    .select({ id: units.id, consorcioId: units.consorcioId })
    .from(units)
    .where(eq(units.id, parsed.data.unitId))
    .limit(1);
  if (!unitRow) return { ok: false, error: "La unidad no existe." };
  if (!canAccessConsorcio(ctx, unitRow.consorcioId)) {
    return { ok: false, error: "No tenés permisos sobre ese consorcio." };
  }

  const existing = await db
    .select({ id: expenses.id })
    .from(expenses)
    .where(
      and(
        eq(expenses.unitId, parsed.data.unitId),
        eq(expenses.period, parsed.data.period),
      ),
    )
    .limit(1);
  if (existing.length > 0) {
    return {
      ok: false,
      error: "Ya hay una expensa para esa unidad y período.",
    };
  }

  await db.insert(expenses).values({
    unitId: parsed.data.unitId,
    period: parsed.data.period,
    dueDate: new Date(parsed.data.dueDate),
    amountCents: parsed.data.amountPesos * 100,
    type: parsed.data.type,
    description: parsed.data.description?.trim() ?? null,
  });

  revalidatePath("/admin");
  revalidatePath("/expensas");
  revalidatePath("/");
  return { ok: true };
}

const expenditurePayloadSchema = z.object({
  consorcioId: z.uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Formato YYYY-MM-DD." }),
  description: z
    .string()
    .min(3, "Falta una descripción más completa.")
    .max(200, "La descripción es muy larga."),
  amountPesos: z.coerce.number().int().positive("El monto debe ser mayor a 0."),
  category: z.enum([
    "limpieza",
    "mantenimiento",
    "jardineria",
    "seguridad",
    "servicios",
    "obras",
    "administracion",
    "otros",
  ]),
  vendor: z.string().max(120).optional(),
  notes: z.string().max(500).optional(),
});

const MAX_RECEIPT_SIZE = 4 * 1024 * 1024;

async function uploadReceipt(
  file: File,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (file.size > MAX_RECEIPT_SIZE) {
    return { ok: false, error: "El comprobante supera los 4MB." };
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return {
      ok: false,
      error:
        "Falta configurar Vercel Blob (BLOB_READ_WRITE_TOKEN) para subir archivos.",
    };
  }
  try {
    const safeName = file.name.replaceAll(/[^\w.-]/g, "_");
    const blob = await put(`receipts/${crypto.randomUUID()}-${safeName}`, file, {
      access: "public",
      addRandomSuffix: false,
    });
    return { ok: true, url: blob.url };
  } catch (e) {
    console.error("Failed to upload receipt:", e);
    return { ok: false, error: "No pudimos subir el comprobante. Probá de nuevo." };
  }
}

async function deleteReceipt(url: string | null): Promise<void> {
  if (!url || !process.env.BLOB_READ_WRITE_TOKEN) return;
  try {
    await del(url);
  } catch (e) {
    console.error("Failed to delete blob:", e);
  }
}

function getReceiptFile(formData: FormData): File | null {
  const raw = formData.get("receipt");
  if (raw instanceof File && raw.size > 0) return raw;
  return null;
}

export async function createExpenditure(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireAdminContext();
  if (!ctx) return { ok: false, error: "Sin permisos." };

  const parsed = expenditurePayloadSchema.safeParse({
    consorcioId: formData.get("consorcioId"),
    date: formData.get("date"),
    description: formData.get("description"),
    amountPesos: formData.get("amountPesos"),
    category: formData.get("category"),
    vendor: formData.get("vendor") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  if (!canAccessConsorcio(ctx, parsed.data.consorcioId)) {
    return { ok: false, error: "No tenés permisos sobre ese consorcio." };
  }

  let receiptUrl: string | null = null;
  const file = getReceiptFile(formData);
  if (file) {
    const result = await uploadReceipt(file);
    if (!result.ok) return result;
    receiptUrl = result.url;
  }

  await db.insert(expenditures).values({
    consorcioId: parsed.data.consorcioId,
    date: new Date(parsed.data.date),
    description: parsed.data.description.trim(),
    amountCents: parsed.data.amountPesos * 100,
    category: parsed.data.category,
    vendor: parsed.data.vendor?.trim() || null,
    receiptUrl,
    notes: parsed.data.notes?.trim() || null,
    createdByUserId: ctx.userId,
  });

  revalidatePath("/admin");
  revalidatePath("/gastos");
  revalidatePath("/balance");
  return { ok: true };
}

const updateExpenditureSchema = expenditurePayloadSchema.extend({
  id: z.uuid(),
});

export async function updateExpenditure(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireAdminContext();
  if (!ctx) return { ok: false, error: "Sin permisos." };

  const parsed = updateExpenditureSchema.safeParse({
    id: formData.get("id"),
    consorcioId: formData.get("consorcioId"),
    date: formData.get("date"),
    description: formData.get("description"),
    amountPesos: formData.get("amountPesos"),
    category: formData.get("category"),
    vendor: formData.get("vendor") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const [existing] = await db
    .select({
      consorcioId: expenditures.consorcioId,
      receiptUrl: expenditures.receiptUrl,
    })
    .from(expenditures)
    .where(eq(expenditures.id, parsed.data.id))
    .limit(1);
  if (!existing) return { ok: false, error: "El gasto no existe." };

  if (
    !canAccessConsorcio(ctx, existing.consorcioId) ||
    !canAccessConsorcio(ctx, parsed.data.consorcioId)
  ) {
    return { ok: false, error: "No tenés permisos sobre ese consorcio." };
  }

  let receiptUrl: string | null = existing.receiptUrl;
  const file = getReceiptFile(formData);
  if (file) {
    const result = await uploadReceipt(file);
    if (!result.ok) return result;
    await deleteReceipt(existing.receiptUrl);
    receiptUrl = result.url;
  }

  await db
    .update(expenditures)
    .set({
      consorcioId: parsed.data.consorcioId,
      date: new Date(parsed.data.date),
      description: parsed.data.description.trim(),
      amountCents: parsed.data.amountPesos * 100,
      category: parsed.data.category,
      vendor: parsed.data.vendor?.trim() || null,
      receiptUrl,
      notes: parsed.data.notes?.trim() || null,
    })
    .where(eq(expenditures.id, parsed.data.id));

  revalidatePath("/admin");
  revalidatePath("/gastos");
  revalidatePath("/balance");
  return { ok: true };
}

export async function deleteExpenditure(id: string): Promise<ActionResult> {
  const ctx = await requireAdminContext();
  if (!ctx) return { ok: false, error: "Sin permisos." };

  const [existing] = await db
    .select({
      consorcioId: expenditures.consorcioId,
      receiptUrl: expenditures.receiptUrl,
    })
    .from(expenditures)
    .where(eq(expenditures.id, id))
    .limit(1);
  if (!existing) return { ok: false, error: "El gasto no existe." };
  if (!canAccessConsorcio(ctx, existing.consorcioId)) {
    return { ok: false, error: "No tenés permisos sobre ese consorcio." };
  }

  await db.delete(expenditures).where(eq(expenditures.id, id));
  await deleteReceipt(existing.receiptUrl);

  revalidatePath("/admin");
  revalidatePath("/gastos");
  revalidatePath("/balance");
  return { ok: true };
}
