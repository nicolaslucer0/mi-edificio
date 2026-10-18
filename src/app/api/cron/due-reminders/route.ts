import { and, gte, inArray, isNull, lt, notInArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { expenses, paymentClaims } from "@/lib/db/schema";
import { notifyDueDate } from "@/lib/notifications";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DAY_MS = 86_400_000;

/**
 * Aviso diario de "tu expensa vence mañana".
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
    return Response.json({ ok: true, reminded: 0, skipped: 0 });
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
    return Response.json({ ok: true, reminded: 0, skipped });
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

  return Response.json({ ok: true, reminded: pending.length, skipped });
}
