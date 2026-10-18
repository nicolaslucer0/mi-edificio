import { and, gte, inArray, isNull, lt, notInArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { expenses, paymentClaims } from "@/lib/db/schema";
import { notifyDueDate, notifyOverdue } from "@/lib/notifications";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DAY_MS = 86_400_000;
/** A cuántos días del vencimiento va el "¿ya pagaste?". */
const OVERDUE_DAYS = 3;

/**
 * Avisos diarios de vencimiento: "tu expensa vence mañana" y, unos días
 * después de vencida, "¿ya pagaste?".
 *
 * Es el recordatorio con más valor para el consorcio —mueve la cobranza más
 * que cualquier tablero— y hasta ahora la preferencia `dueDateReminder`
 * existía sin que nada la disparara.
 *
 * Las fechas se comparan por día UTC, igual que `formatDueUrgency`, que es el
 * criterio con el que la app viene mostrando los vencimientos. En la base los
 * vencimientos quedan guardados a las 03:00 UTC —medianoche de Argentina—, así
 * que caen dentro del día UTC que corresponde y la ventana cierra bien.
 *
 * Corre 12:00 UTC, o sea 9 de la mañana en Argentina: el aviso llega a una
 * hora en la que alguien lo puede leer y todavía llegar a pagar.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const dueTomorrow = await remindDueTomorrow(now, todayUtc);
  const overdue = await remindOverdue(todayUtc);
  return Response.json({ ok: true, ...dueTomorrow, overdue });
}

/** "Tu expensa vence mañana", una vez por expensa (marca dueReminderSentAt). */
async function remindDueTomorrow(
  now: Date,
  todayUtc: number,
): Promise<{ reminded: number; skipped: number }> {
  const tomorrow = new Date(todayUtc + DAY_MS);
  const dayAfter = new Date(todayUtc + 2 * DAY_MS);

  const candidates = await db
    .select({
      id: expenses.id,
      unitId: expenses.unitId,
      period: expenses.period,
      type: expenses.type,
      amountCents: expenses.amountCents,
      paidCents: expenses.paidCents,
    })
    .from(expenses)
    .where(
      and(
        gte(expenses.dueDate, tomorrow),
        lt(expenses.dueDate, dayAfter),
        notInArray(expenses.status, ["pagado"]),
        // La marca es lo que hace idempotente al cron: si se reintenta o si
        // alguien lo dispara a mano, no se avisa dos veces.
        isNull(expenses.dueReminderSentAt),
      ),
    );

  if (candidates.length === 0) {
    return { reminded: 0, skipped: 0 };
  }

  // Quien ya informó un pago no tiene que recibir un recordatorio: todavía no
  // está validado, pero de su lado la expensa está saldada.
  const pendingClaims = await db
    .select({ expenseId: paymentClaims.expenseId })
    .from(paymentClaims)
    .where(
      and(
        inArray(
          paymentClaims.expenseId,
          candidates.map((c) => c.id),
        ),
        inArray(paymentClaims.resolution, ["pending"]),
      ),
    );
  const claimed = new Set(pendingClaims.map((c) => c.expenseId));

  const pending = candidates.filter(
    (c) => !claimed.has(c.id) && c.paidCents < c.amountCents,
  );
  const skipped = candidates.length - pending.length;

  if (pending.length === 0) {
    return { reminded: 0, skipped };
  }

  // Un aviso por período, tipo y monto: el texto dice el importe correcto, y
  // el tipo decide a quién le llega (la extraordinaria, solo al propietario).
  const groups = new Map<
    string,
    {
      period: string;
      type: (typeof pending)[number]["type"];
      amountCents: number;
      unitIds: string[];
    }
  >();
  for (const item of pending) {
    const key = `${item.period}·${item.type}·${item.amountCents}`;
    const group = groups.get(key);
    if (group) group.unitIds.push(item.unitId);
    else
      groups.set(key, {
        period: item.period,
        type: item.type,
        amountCents: item.amountCents,
        unitIds: [item.unitId],
      });
  }

  for (const group of groups.values()) {
    await notifyDueDate(group);
  }

  await db
    .update(expenses)
    .set({ dueReminderSentAt: now })
    .where(
      inArray(
        expenses.id,
        pending.map((p) => p.id),
      ),
    );

  return { reminded: pending.length, skipped };
}

/**
 * "¿Ya pagaste?" a los OVERDUE_DAYS días del vencimiento, a quien no tiene
 * el pago registrado ni avisado. Es el caso real de octubre: vecinos que
 * pagaron meses por transferencia y nunca lo informaron. Va antes de que
 * termine el período de gracia del estado de pagos (10 días por default),
 * para que nadie figure como deudor por no haber avisado.
 *
 * Sin marca en la expensa: la ventana es de un solo día, y notifyOverdue no
 * repite el aviso a quien ya lo tiene (el link lleva el id de la expensa).
 */
async function remindOverdue(todayUtc: number): Promise<number> {
  const from = new Date(todayUtc - OVERDUE_DAYS * DAY_MS);
  const to = new Date(todayUtc - (OVERDUE_DAYS - 1) * DAY_MS);

  const candidates = await db
    .select({
      id: expenses.id,
      unitId: expenses.unitId,
      period: expenses.period,
      type: expenses.type,
      amountCents: expenses.amountCents,
      paidCents: expenses.paidCents,
    })
    .from(expenses)
    .where(
      and(
        gte(expenses.dueDate, from),
        lt(expenses.dueDate, to),
        // en_validacion: ya avisó, falta que lo valide el admin.
        notInArray(expenses.status, ["pagado", "en_validacion"]),
      ),
    );

  const owed = candidates.filter((c) => c.paidCents < c.amountCents);
  if (owed.length === 0) return 0;

  await notifyOverdue(
    owed.map((c) => ({
      expenseId: c.id,
      unitId: c.unitId,
      period: c.period,
      type: c.type,
      remainingCents: c.amountCents - c.paidCents,
    })),
  );
  return owed.length;
}
