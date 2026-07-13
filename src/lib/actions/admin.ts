"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  consorcios,
  creditDeposits,
  expenditures,
  expenses,
  memberships,
  paymentClaims,
  unitCredits,
  units,
  users,
} from "@/lib/db/schema";
import {
  sendPaymentConfirmedEmail,
  sendPaymentRejectedEmail,
} from "@/lib/email";
import { deleteReceipt, getReceiptFile, uploadReceipt } from "@/lib/receipts";
import { notifyNewExpense, notifyPaymentResolved } from "@/lib/notifications";
import { remainingCents } from "@/lib/payments";
import { applyCreditToUnit, recomputeExpensePaid } from "@/lib/credits";
import { splitAmount } from "@/lib/expenses-split";

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
      claimAmountCents: paymentClaims.amountCents,
      expenseId: expenses.id,
      unitId: expenses.unitId,
      period: expenses.period,
      amountCents: expenses.amountCents,
      paidCents: expenses.paidCents,
      unitLabel: units.label,
      consorcioId: units.consorcioId,
      claimerUserId: paymentClaims.claimedByUserId,
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

export async function approveClaim(
  claimId: string,
  confirmedAmountCents?: number,
): Promise<ActionResult> {
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

  const informed = claim.claimAmountCents ?? claim.amountCents;
  const requested = Math.max(1, confirmedAmountCents ?? informed);
  // Lo que cabe en la expensa; el excedente (sobrepago) va a saldo a favor.
  const maxForThis = remainingCents(claim.amountCents, claim.paidCents);
  const appliedToExpense = Math.min(requested, maxForThis);
  const excess = requested - appliedToExpense;

  await db
    .update(paymentClaims)
    .set({
      resolution: "approved",
      confirmedAmountCents: appliedToExpense,
      resolvedByUserId: ctx.userId,
      resolvedAt: new Date(),
    })
    .where(eq(paymentClaims.id, claim.claimId));

  await recomputeExpensePaid(claim.expenseId);

  if (excess > 0) {
    await db.insert(unitCredits).values({
      unitId: claim.unitId,
      amountCents: excess,
      reason: "overpayment",
      relatedClaimId: claim.claimId,
      createdByUserId: ctx.userId,
    });
  }
  // Aplica saldo a favor (el excedente recién creado y/o el preexistente).
  await applyCreditToUnit(claim.unitId);

  if (claim.claimerEmail) {
    try {
      await sendPaymentConfirmedEmail({
        to: claim.claimerEmail,
        period: claim.period,
        amountCents: appliedToExpense,
        unitLabel: claim.unitLabel,
        notificationPrefs: claim.claimerPrefs,
      });
    } catch (e) {
      console.error("Failed to send confirmation email:", e);
    }
  }

  await notifyPaymentResolved({
    userId: claim.claimerUserId,
    prefs: claim.claimerPrefs,
    resolution: "approved",
    period: claim.period,
    amountCents: appliedToExpense,
    unitLabel: claim.unitLabel,
  });

  revalidatePath("/admin", "layout");
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

  // Rechazar un pago no borra lo ya pagado: se recalcula el estado desde los
  // claims restantes (puede quedar parcial, pendiente o rechazado).
  await recomputeExpensePaid(claim.expenseId);
  // La deuda que reabre el rechazo puede cubrirse con saldo a favor existente.
  await applyCreditToUnit(claim.unitId);

  if (claim.claimerEmail) {
    try {
      await sendPaymentRejectedEmail({
        to: claim.claimerEmail,
        period: claim.period,
        amountCents: claim.claimAmountCents ?? claim.amountCents,
        unitLabel: claim.unitLabel,
        reason: parsed.data.reason,
        notificationPrefs: claim.claimerPrefs,
      });
    } catch (e) {
      console.error("Failed to send rejection email:", e);
    }
  }

  await notifyPaymentResolved({
    userId: claim.claimerUserId,
    prefs: claim.claimerPrefs,
    resolution: "rejected",
    period: claim.period,
    amountCents: claim.claimAmountCents ?? claim.amountCents,
    unitLabel: claim.unitLabel,
    reason: parsed.data.reason,
  });

  revalidatePath("/admin", "layout");
  revalidatePath("/expensas");
  revalidatePath("/");
  return { ok: true };
}

export async function approveCreditDeposit(
  depositId: string,
): Promise<ActionResult> {
  const ctx = await requireAdminContext();
  if (!ctx) return { ok: false, error: "Sin permisos." };

  const [deposit] = await db
    .select({
      unitId: creditDeposits.unitId,
      amountCents: creditDeposits.amountCents,
      status: creditDeposits.status,
      consorcioId: units.consorcioId,
    })
    .from(creditDeposits)
    .innerJoin(units, eq(units.id, creditDeposits.unitId))
    .where(eq(creditDeposits.id, depositId))
    .limit(1);
  if (!deposit) return { ok: false, error: "El adelanto no existe." };
  if (!canAccessConsorcio(ctx, deposit.consorcioId)) {
    return { ok: false, error: "No tenés permisos sobre ese consorcio." };
  }
  if (deposit.status !== "pending") {
    return { ok: false, error: "Este adelanto ya fue resuelto." };
  }

  await db
    .update(creditDeposits)
    .set({
      status: "approved",
      resolvedByUserId: ctx.userId,
      resolvedAt: new Date(),
    })
    .where(eq(creditDeposits.id, depositId));

  await db.insert(unitCredits).values({
    unitId: deposit.unitId,
    amountCents: deposit.amountCents,
    reason: "deposit",
    createdByUserId: ctx.userId,
  });
  // El adelanto validado se aplica a las deudas de la unidad (si las hay).
  await applyCreditToUnit(deposit.unitId);

  revalidatePath("/admin", "layout");
  revalidatePath("/expensas");
  revalidatePath("/");
  return { ok: true };
}

export async function rejectCreditDeposit(
  depositId: string,
  reason: string,
): Promise<ActionResult> {
  const ctx = await requireAdminContext();
  if (!ctx) return { ok: false, error: "Sin permisos." };

  const trimmed = reason.trim();
  if (trimmed.length < 3) {
    return { ok: false, error: "Contanos por qué rechazás el adelanto." };
  }

  const [deposit] = await db
    .select({
      status: creditDeposits.status,
      consorcioId: units.consorcioId,
    })
    .from(creditDeposits)
    .innerJoin(units, eq(units.id, creditDeposits.unitId))
    .where(eq(creditDeposits.id, depositId))
    .limit(1);
  if (!deposit) return { ok: false, error: "El adelanto no existe." };
  if (!canAccessConsorcio(ctx, deposit.consorcioId)) {
    return { ok: false, error: "No tenés permisos sobre ese consorcio." };
  }
  if (deposit.status !== "pending") {
    return { ok: false, error: "Este adelanto ya fue resuelto." };
  }

  await db
    .update(creditDeposits)
    .set({
      status: "rejected",
      resolvedByUserId: ctx.userId,
      resolvedAt: new Date(),
      rejectionReason: trimmed.slice(0, 500),
    })
    .where(eq(creditDeposits.id, depositId));

  revalidatePath("/admin", "layout");
  revalidatePath("/expensas");
  return { ok: true };
}

const paymentInfoSchema = z.object({
  consorcioId: z.uuid(),
  paymentHolderName: z.string().min(1, "Falta el titular.").max(120),
  paymentAlias: z.string().min(6, "El alias es muy corto.").max(40),
  paymentCbu: z
    .string()
    .refine((v) => v === "" || /^\d{22}$/.test(v), {
      message: "El CBU/CVU debe tener 22 dígitos.",
    }),
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
      paymentCbu: parsed.data.paymentCbu.trim() || null,
    })
    .where(eq(consorcios.id, parsed.data.consorcioId));

  revalidatePath("/admin", "layout");
  revalidatePath("/expensas");
  return { ok: true };
}

const openingBalanceSchema = z.object({
  consorcioId: z.uuid(),
  openingBalancePesos: z.coerce
    .number()
    .int()
    .gte(0, "El saldo no puede ser negativo."),
  openingBalanceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Formato YYYY-MM-DD." }),
});

export async function updateOpeningBalance(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireAdminContext();
  if (!ctx) return { ok: false, error: "Sin permisos." };

  const parsed = openingBalanceSchema.safeParse({
    consorcioId: formData.get("consorcioId"),
    openingBalancePesos: formData.get("openingBalancePesos"),
    openingBalanceDate: formData.get("openingBalanceDate"),
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

  await db
    .update(consorcios)
    .set({
      openingBalanceCents: parsed.data.openingBalancePesos * 100,
      openingBalanceDate: new Date(parsed.data.openingBalanceDate),
    })
    .where(eq(consorcios.id, parsed.data.consorcioId));

  revalidatePath("/admin", "layout");
  revalidatePath("/balance");
  return { ok: true };
}

const createExpenseSchema = z.object({
  consorcioId: z.uuid(),
  mode: z.enum(["fixed", "split", "single"]),
  unitId: z.string().optional(),
  amountPesos: z.coerce.number().int().positive().optional(),
  totalPesos: z.coerce.number().int().positive().optional(),
  period: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, { message: "Formato YYYY-MM." }),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Formato YYYY-MM-DD." }),
  type: z.enum(["ordinaria", "extraordinaria"]),
  description: z.string().max(500).optional(),
});

export type CreateExpenseResult =
  | { ok: true; created: number; skipped: number }
  | { ok: false; error: string };

export async function createExpense(
  _prev: CreateExpenseResult | null,
  formData: FormData,
): Promise<CreateExpenseResult> {
  const ctx = await requireAdminContext();
  if (!ctx) return { ok: false, error: "Sin permisos." };

  const parsed = createExpenseSchema.safeParse({
    consorcioId: formData.get("consorcioId"),
    mode: formData.get("mode"),
    unitId: formData.get("unitId") || undefined,
    amountPesos: formData.get("amountPesos") || undefined,
    totalPesos: formData.get("totalPesos") || undefined,
    period: formData.get("period"),
    dueDate: formData.get("dueDate"),
    type: formData.get("type"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }
  const d = parsed.data;

  if (!canAccessConsorcio(ctx, d.consorcioId)) {
    return { ok: false, error: "No tenés permisos sobre ese consorcio." };
  }

  const description = d.description?.trim() || null;
  const dueDate = new Date(d.dueDate);

  // Monto por unidad según el modo de cobro.
  let targets: { unitId: string; amountCents: number }[] = [];

  if (d.mode === "single") {
    if (!d.unitId) return { ok: false, error: "Elegí un departamento." };
    if (!d.amountPesos) return { ok: false, error: "Ingresá el monto." };
    const [unitRow] = await db
      .select({ consorcioId: units.consorcioId })
      .from(units)
      .where(eq(units.id, d.unitId))
      .limit(1);
    if (!unitRow || unitRow.consorcioId !== d.consorcioId) {
      return { ok: false, error: "La unidad no existe." };
    }
    targets = [{ unitId: d.unitId, amountCents: d.amountPesos * 100 }];
  } else {
    const unitRows = await db
      .select({ id: units.id, coefficient: units.coefficient })
      .from(units)
      .where(eq(units.consorcioId, d.consorcioId));
    if (unitRows.length === 0) {
      return {
        ok: false,
        error: "Este consorcio todavía no tiene unidades cargadas.",
      };
    }

    if (d.mode === "fixed") {
      if (!d.amountPesos) {
        return { ok: false, error: "Ingresá el monto por departamento." };
      }
      const cents = d.amountPesos * 100;
      targets = unitRows.map((u) => ({ unitId: u.id, amountCents: cents }));
    } else {
      if (!d.totalPesos) {
        return { ok: false, error: "Ingresá el monto total a repartir." };
      }
      const totalCents = d.totalPesos * 100;
      // Proporcional solo si TODAS las unidades tienen coeficiente; si no,
      // partes iguales.
      const allHaveCoef = unitRows.every(
        (u) => u.coefficient != null && Number(u.coefficient) > 0,
      );
      const weights = allHaveCoef
        ? unitRows.map((u) => Number(u.coefficient))
        : unitRows.map(() => 1);
      const shares = splitAmount(totalCents, weights);
      targets = unitRows.map((u, i) => ({
        unitId: u.id,
        amountCents: shares[i],
      }));
    }
  }

  const targetUnitIds = targets.map((t) => t.unitId);
  const existing = await db
    .select({ unitId: expenses.unitId })
    .from(expenses)
    .where(
      and(
        inArray(expenses.unitId, targetUnitIds),
        eq(expenses.period, d.period),
        eq(expenses.type, d.type),
      ),
    );
  const existingSet = new Set(existing.map((e) => e.unitId));

  if (d.mode === "split" && existingSet.size > 0) {
    return {
      ok: false,
      error:
        "Algunas unidades ya tienen una expensa de ese período y tipo. Para repartir un total, ninguna debe tenerla.",
    };
  }

  const toInsert = targets.filter((t) => !existingSet.has(t.unitId));
  if (toInsert.length === 0) {
    const typeLabel =
      d.type === "ordinaria" ? "ordinaria" : "extraordinaria";
    return {
      ok: false,
      error:
        d.mode === "single"
          ? `Esa unidad ya tiene una expensa ${typeLabel} para ese período.`
          : `Todas las unidades ya tienen una expensa ${typeLabel} para ese período.`,
    };
  }

  await db.insert(expenses).values(
    toInsert.map((t) => ({
      unitId: t.unitId,
      period: d.period,
      dueDate,
      amountCents: t.amountCents,
      type: d.type,
      description,
    })),
  );

  // Si la unidad tiene saldo a favor, se aplica a la expensa recién creada.
  for (const t of toInsert) {
    await applyCreditToUnit(t.unitId);
  }

  // Notificar agrupando por monto (para reflejar el importe correcto).
  const unitIdsByAmount = new Map<number, string[]>();
  for (const t of toInsert) {
    const list = unitIdsByAmount.get(t.amountCents) ?? [];
    list.push(t.unitId);
    unitIdsByAmount.set(t.amountCents, list);
  }
  for (const [amountCents, unitIds] of unitIdsByAmount) {
    await notifyNewExpense({ unitIds, period: d.period, amountCents });
  }

  revalidatePath("/admin", "layout");
  revalidatePath("/expensas");
  revalidatePath("/");

  return { ok: true, created: toInsert.length, skipped: existingSet.size };
}

const updateExpenseSchema = z.object({
  id: z.uuid(),
  period: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, { message: "Formato YYYY-MM." }),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Formato YYYY-MM-DD." }),
  amountPesos: z.coerce.number().int().positive("El monto debe ser mayor a 0."),
  type: z.enum(["ordinaria", "extraordinaria"]),
  description: z.string().max(500).optional(),
});

export async function updateExpense(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireAdminContext();
  if (!ctx) return { ok: false, error: "Sin permisos." };

  const parsed = updateExpenseSchema.safeParse({
    id: formData.get("id"),
    period: formData.get("period"),
    dueDate: formData.get("dueDate"),
    amountPesos: formData.get("amountPesos"),
    type: formData.get("type"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const [current] = await db
    .select({
      id: expenses.id,
      unitId: expenses.unitId,
      consorcioId: units.consorcioId,
      currentPeriod: expenses.period,
      currentType: expenses.type,
    })
    .from(expenses)
    .innerJoin(units, eq(units.id, expenses.unitId))
    .where(eq(expenses.id, parsed.data.id))
    .limit(1);
  if (!current) return { ok: false, error: "La expensa no existe." };
  if (!canAccessConsorcio(ctx, current.consorcioId)) {
    return { ok: false, error: "No tenés permisos sobre ese consorcio." };
  }

  if (
    parsed.data.period !== current.currentPeriod ||
    parsed.data.type !== current.currentType
  ) {
    const [dup] = await db
      .select({ id: expenses.id })
      .from(expenses)
      .where(
        and(
          eq(expenses.unitId, current.unitId),
          eq(expenses.period, parsed.data.period),
          eq(expenses.type, parsed.data.type),
        ),
      )
      .limit(1);
    if (dup && dup.id !== parsed.data.id) {
      const typeLabel =
        parsed.data.type === "ordinaria" ? "ordinaria" : "extraordinaria";
      return {
        ok: false,
        error: `Ya hay una expensa ${typeLabel} para esa unidad y período.`,
      };
    }
  }

  await db
    .update(expenses)
    .set({
      period: parsed.data.period,
      dueDate: new Date(parsed.data.dueDate),
      amountCents: parsed.data.amountPesos * 100,
      type: parsed.data.type,
      description: parsed.data.description?.trim() || null,
    })
    .where(eq(expenses.id, parsed.data.id));

  revalidatePath("/admin", "layout");
  revalidatePath("/expensas");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  const ctx = await requireAdminContext();
  if (!ctx) return { ok: false, error: "Sin permisos." };

  const [current] = await db
    .select({
      id: expenses.id,
      consorcioId: units.consorcioId,
    })
    .from(expenses)
    .innerJoin(units, eq(units.id, expenses.unitId))
    .where(eq(expenses.id, id))
    .limit(1);
  if (!current) return { ok: false, error: "La expensa no existe." };
  if (!canAccessConsorcio(ctx, current.consorcioId)) {
    return { ok: false, error: "No tenés permisos sobre ese consorcio." };
  }

  await db.delete(expenses).where(eq(expenses.id, id));

  revalidatePath("/admin", "layout");
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

  revalidatePath("/admin", "layout");
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

  revalidatePath("/admin", "layout");
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

  revalidatePath("/admin", "layout");
  revalidatePath("/gastos");
  revalidatePath("/balance");
  return { ok: true };
}

const addMembershipSchema = z
  .object({
    email: z.email("Ingresá un email válido."),
    name: z.string().max(120).optional(),
    role: z.enum(["admin", "owner", "tenant"]),
    consorcioId: z.uuid(),
    unitId: z.string().optional(),
  })
  .refine(
    (v) => v.role === "admin" || (v.unitId && /^[0-9a-f-]{36}$/i.test(v.unitId)),
    { message: "Elegí una unidad para este rol.", path: ["unitId"] },
  );

export async function addUserMembership(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireAdminContext();
  if (!ctx) return { ok: false, error: "Sin permisos." };

  const parsed = addMembershipSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name") || undefined,
    role: formData.get("role"),
    consorcioId: formData.get("consorcioId"),
    unitId: formData.get("unitId") || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const { email, name, role, consorcioId, unitId } = parsed.data;

  if (!canAccessConsorcio(ctx, consorcioId)) {
    return { ok: false, error: "No tenés permisos sobre ese consorcio." };
  }

  let resolvedUnitId: string | null = null;
  if (role === "owner" || role === "tenant") {
    if (!unitId) return { ok: false, error: "Falta la unidad." };
    const [unitRow] = await db
      .select({ consorcioId: units.consorcioId })
      .from(units)
      .where(eq(units.id, unitId))
      .limit(1);
    if (!unitRow) return { ok: false, error: "La unidad no existe." };
    if (unitRow.consorcioId !== consorcioId) {
      return { ok: false, error: "La unidad no pertenece a ese consorcio." };
    }
    resolvedUnitId = unitId;
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name?.trim() || null;

  const [existingUser] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.email, cleanEmail))
    .limit(1);

  let userId: string;
  if (existingUser) {
    userId = existingUser.id;
    if (cleanName && !existingUser.name) {
      await db
        .update(users)
        .set({ name: cleanName })
        .where(eq(users.id, userId));
    }
  } else {
    const [created] = await db
      .insert(users)
      .values({ email: cleanEmail, name: cleanName })
      .returning({ id: users.id });
    userId = created.id;
  }

  const dupConditions = [
    eq(memberships.userId, userId),
    eq(memberships.role, role),
    eq(memberships.consorcioId, consorcioId),
  ];
  if (resolvedUnitId) {
    dupConditions.push(eq(memberships.unitId, resolvedUnitId));
  }
  const [dup] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(...dupConditions))
    .limit(1);
  if (dup) {
    return { ok: false, error: "Esa persona ya tiene esa asignación." };
  }

  await db.insert(memberships).values({
    userId,
    role,
    consorcioId,
    unitId: resolvedUnitId,
  });

  revalidatePath("/admin", "layout");
  return { ok: true };
}

const updateMembershipSchema = z
  .object({
    membershipId: z.uuid(),
    role: z.enum(["admin", "owner", "tenant"]),
    unitId: z.string().optional(),
  })
  .refine(
    (v) => v.role === "admin" || (v.unitId && /^[0-9a-f-]{36}$/i.test(v.unitId)),
    { message: "Elegí una unidad para este rol.", path: ["unitId"] },
  );

export async function updateUserMembership(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireAdminContext();
  if (!ctx) return { ok: false, error: "Sin permisos." };

  const parsed = updateMembershipSchema.safeParse({
    membershipId: formData.get("membershipId"),
    role: formData.get("role"),
    unitId: formData.get("unitId") || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const { membershipId, role, unitId } = parsed.data;

  const [current] = await db
    .select({
      id: memberships.id,
      userId: memberships.userId,
      role: memberships.role,
      consorcioId: memberships.consorcioId,
      unitId: memberships.unitId,
    })
    .from(memberships)
    .where(eq(memberships.id, membershipId))
    .limit(1);
  if (!current) return { ok: false, error: "La asignación no existe." };
  if (current.role === "super_admin") {
    return { ok: false, error: "No se puede modificar al administrador general." };
  }
  if (!current.consorcioId || !canAccessConsorcio(ctx, current.consorcioId)) {
    return { ok: false, error: "No tenés permisos sobre ese consorcio." };
  }
  if (
    current.userId === ctx.userId &&
    current.role === "admin" &&
    role !== "admin"
  ) {
    return {
      ok: false,
      error: "No podés quitarte a vos mismo como admin del consorcio.",
    };
  }

  let resolvedUnitId: string | null = null;
  if (role === "owner" || role === "tenant") {
    if (!unitId) return { ok: false, error: "Falta la unidad." };
    const [unitRow] = await db
      .select({ consorcioId: units.consorcioId })
      .from(units)
      .where(eq(units.id, unitId))
      .limit(1);
    if (!unitRow) return { ok: false, error: "La unidad no existe." };
    if (unitRow.consorcioId !== current.consorcioId) {
      return { ok: false, error: "La unidad no pertenece a ese consorcio." };
    }
    resolvedUnitId = unitId;
  }

  const dupConditions = [
    eq(memberships.userId, current.userId),
    eq(memberships.role, role),
    eq(memberships.consorcioId, current.consorcioId),
  ];
  if (resolvedUnitId) dupConditions.push(eq(memberships.unitId, resolvedUnitId));
  const dupRows = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(...dupConditions));
  if (dupRows.some((r) => r.id !== membershipId)) {
    return { ok: false, error: "Esa persona ya tiene esa asignación." };
  }

  await db
    .update(memberships)
    .set({ role, unitId: resolvedUnitId })
    .where(eq(memberships.id, membershipId));

  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function removeUserMembership(
  membershipId: string,
): Promise<ActionResult> {
  const ctx = await requireAdminContext();
  if (!ctx) return { ok: false, error: "Sin permisos." };

  const [m] = await db
    .select({
      id: memberships.id,
      userId: memberships.userId,
      role: memberships.role,
      consorcioId: memberships.consorcioId,
    })
    .from(memberships)
    .where(eq(memberships.id, membershipId))
    .limit(1);
  if (!m) return { ok: false, error: "La asignación no existe." };

  if (m.role === "super_admin") {
    return {
      ok: false,
      error: "No se puede borrar al administrador general desde acá.",
    };
  }
  if (!m.consorcioId || !canAccessConsorcio(ctx, m.consorcioId)) {
    return { ok: false, error: "No tenés permisos sobre ese consorcio." };
  }
  if (m.userId === ctx.userId && m.role === "admin") {
    return {
      ok: false,
      error: "No podés quitarte a vos mismo como admin del consorcio.",
    };
  }

  await db.delete(memberships).where(eq(memberships.id, membershipId));

  revalidatePath("/admin", "layout");
  return { ok: true };
}

const createConsorcioSchema = z.object({
  name: z.string().min(3, "El nombre es muy corto.").max(120),
  type: z.enum(["edificio", "ph", "barrio_cerrado"]),
  address: z.string().max(200).optional(),
});

export async function createConsorcio(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireAdminContext();
  if (!ctx) return { ok: false, error: "Sin permisos." };
  if (!ctx.isSuperAdmin) {
    return {
      ok: false,
      error: "Sólo el administrador general puede crear consorcios.",
    };
  }

  const parsed = createConsorcioSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    address: formData.get("address") || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  await db.insert(consorcios).values({
    name: parsed.data.name.trim(),
    type: parsed.data.type,
    address: parsed.data.address?.trim() || null,
  });

  revalidatePath("/admin", "layout");
  return { ok: true };
}

const createUnitSchema = z.object({
  consorcioId: z.uuid(),
  label: z.string().min(1, "Falta el nombre/número.").max(40),
  floor: z.string().max(20).optional(),
});

/**
 * Parsea el coeficiente (%) de una unidad. Acepta coma o punto decimal.
 * Devuelve el valor como string "10.30", null si viene vacío, o "invalid".
 */
function parseCoefficient(
  raw: FormDataEntryValue | null,
): string | null | "invalid" {
  const s = raw?.toString().trim().replace(",", ".") ?? "";
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || n > 100) return "invalid";
  return (Math.round(n * 100) / 100).toFixed(2);
}

export async function createUnit(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireAdminContext();
  if (!ctx) return { ok: false, error: "Sin permisos." };

  const parsed = createUnitSchema.safeParse({
    consorcioId: formData.get("consorcioId"),
    label: formData.get("label"),
    floor: formData.get("floor") || undefined,
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

  const coefficient = parseCoefficient(formData.get("coefficient"));
  if (coefficient === "invalid") {
    return { ok: false, error: "El coeficiente debe ser un número de 0 a 100." };
  }

  const cleanLabel = parsed.data.label.trim();
  const cleanFloor = parsed.data.floor?.trim() || null;

  const dupConditions = [
    eq(units.consorcioId, parsed.data.consorcioId),
    eq(units.label, cleanLabel),
  ];
  if (cleanFloor) {
    dupConditions.push(eq(units.floor, cleanFloor));
  }
  const [dup] = await db
    .select({ id: units.id })
    .from(units)
    .where(and(...dupConditions))
    .limit(1);
  if (dup) {
    return { ok: false, error: "Ya existe una unidad con ese nombre y piso." };
  }

  await db.insert(units).values({
    consorcioId: parsed.data.consorcioId,
    label: cleanLabel,
    floor: cleanFloor,
    coefficient,
  });

  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function setUnitCoefficient(
  unitId: string,
  rawCoefficient: string,
): Promise<ActionResult> {
  const ctx = await requireAdminContext();
  if (!ctx) return { ok: false, error: "Sin permisos." };

  const [unit] = await db
    .select({ consorcioId: units.consorcioId })
    .from(units)
    .where(eq(units.id, unitId))
    .limit(1);
  if (!unit) return { ok: false, error: "La unidad no existe." };
  if (!canAccessConsorcio(ctx, unit.consorcioId)) {
    return { ok: false, error: "No tenés permisos sobre ese consorcio." };
  }

  const coefficient = parseCoefficient(rawCoefficient);
  if (coefficient === "invalid") {
    return { ok: false, error: "El coeficiente debe ser un número de 0 a 100." };
  }

  await db
    .update(units)
    .set({ coefficient })
    .where(eq(units.id, unitId));

  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function deleteUnit(unitId: string): Promise<ActionResult> {
  const ctx = await requireAdminContext();
  if (!ctx) return { ok: false, error: "Sin permisos." };

  const [u] = await db
    .select({ id: units.id, consorcioId: units.consorcioId })
    .from(units)
    .where(eq(units.id, unitId))
    .limit(1);
  if (!u) return { ok: false, error: "La unidad no existe." };
  if (!canAccessConsorcio(ctx, u.consorcioId)) {
    return { ok: false, error: "No tenés permisos sobre ese consorcio." };
  }

  const [withMembers] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(eq(memberships.unitId, unitId))
    .limit(1);
  if (withMembers) {
    return {
      ok: false,
      error: "Quitá primero a los vecinos asignados a esta unidad.",
    };
  }
  const [withExpense] = await db
    .select({ id: expenses.id })
    .from(expenses)
    .where(eq(expenses.unitId, unitId))
    .limit(1);
  if (withExpense) {
    return {
      ok: false,
      error: "Esta unidad ya tiene expensas cargadas; no se puede borrar.",
    };
  }

  await db.delete(units).where(eq(units.id, unitId));

  revalidatePath("/admin", "layout");
  return { ok: true };
}
