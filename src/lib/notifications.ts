import "server-only";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  memberships,
  notifications,
  users,
  type NotificationPrefs,
} from "@/lib/db/schema";
import { formatCurrencyCents, formatPeriod } from "@/lib/format";

type NotificationType =
  | "claim_to_validate"
  | "payment_confirmed"
  | "payment_rejected"
  | "new_expense";

type NewNotification = {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  href?: string | null;
};

const PREF_BY_TYPE: Record<NotificationType, keyof NotificationPrefs> = {
  claim_to_validate: "newClaimToValidate",
  payment_confirmed: "paymentConfirmed",
  payment_rejected: "paymentRejected",
  new_expense: "newExpense",
};

function prefAllows(
  prefs: NotificationPrefs | null,
  type: NotificationType,
): boolean {
  return prefs?.[PREF_BY_TYPE[type]] !== false;
}

async function insertNotifications(rows: NewNotification[]): Promise<void> {
  if (rows.length === 0) return;
  await db.insert(notifications).values(
    rows.map((r) => ({
      userId: r.userId,
      type: r.type,
      title: r.title,
      body: r.body ?? null,
      href: r.href ?? null,
    })),
  );
}

/**
 * In-app notifications are best-effort: a failure here must never break the
 * action that triggered it. Callers can `await` without a try/catch.
 */
async function safe(label: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    console.error(`Notification failed (${label}):`, e);
  }
}

type Recipient = { id: string; prefs: NotificationPrefs | null };

function dedupeById(rows: Recipient[]): Recipient[] {
  const map = new Map<string, Recipient>();
  for (const r of rows) if (!map.has(r.id)) map.set(r.id, r);
  return Array.from(map.values());
}

async function adminRecipients(consorcioId: string): Promise<Recipient[]> {
  const rows = await db
    .select({ id: users.id, prefs: users.notificationPrefs })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(
      or(
        eq(memberships.role, "super_admin"),
        and(
          eq(memberships.role, "admin"),
          eq(memberships.consorcioId, consorcioId),
        ),
      ),
    );
  return dedupeById(rows);
}

async function unitMemberRecipients(unitIds: string[]): Promise<Recipient[]> {
  if (unitIds.length === 0) return [];
  const rows = await db
    .select({ id: users.id, prefs: users.notificationPrefs })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(
      and(
        inArray(memberships.unitId, unitIds),
        inArray(memberships.role, ["owner", "tenant"]),
      ),
    );
  return dedupeById(rows);
}

export async function notifyClaimToValidate(params: {
  consorcioId: string;
  unitLabel: string;
  period: string;
  amountCents: number;
  claimedBy: string;
}): Promise<void> {
  await safe("claim_to_validate", async () => {
    const recipients = await adminRecipients(params.consorcioId);
    const title = `Pago por validar · Unidad ${params.unitLabel}`;
    const body = `${params.claimedBy} marcó como pagada la expensa de ${formatPeriod(
      params.period,
    )} (${formatCurrencyCents(params.amountCents)}).`;
    const href = `/admin/${params.consorcioId}/aprobar-pagos`;

    await insertNotifications(
      recipients
        .filter((r) => prefAllows(r.prefs, "claim_to_validate"))
        .map((r) => ({
          userId: r.id,
          type: "claim_to_validate" as const,
          title,
          body,
          href,
        })),
    );
  });
}

export async function notifyPaymentResolved(params: {
  userId: string;
  prefs: NotificationPrefs | null;
  resolution: "approved" | "rejected";
  period: string;
  amountCents: number;
  unitLabel: string;
  reason?: string;
}): Promise<void> {
  const type =
    params.resolution === "approved"
      ? "payment_confirmed"
      : "payment_rejected";
  if (!prefAllows(params.prefs, type)) return;

  await safe(type, async () => {
    const periodLabel = formatPeriod(params.period);
    const amountLabel = formatCurrencyCents(params.amountCents);
    let title: string;
    let body: string;
    if (params.resolution === "approved") {
      title = `Pago confirmado · ${periodLabel}`;
      body = `Tu pago de ${amountLabel} en la unidad ${params.unitLabel} fue confirmado.`;
    } else {
      title = `Pago rechazado · ${periodLabel}`;
      body = `El administrador rechazó tu pago de ${amountLabel}.`;
      if (params.reason) body += ` Motivo: ${params.reason}`;
    }
    await insertNotifications([
      { userId: params.userId, type, title, body, href: "/expensas" },
    ]);
  });
}

export async function notifyNewExpense(params: {
  unitIds: string[];
  period: string;
  amountCents: number;
}): Promise<void> {
  await safe("new_expense", async () => {
    const recipients = await unitMemberRecipients(params.unitIds);
    const title = `Nueva expensa · ${formatPeriod(params.period)}`;
    const body = `Se cargó una expensa de ${formatCurrencyCents(
      params.amountCents,
    )}. Entrá para verla.`;

    await insertNotifications(
      recipients
        .filter((r) => prefAllows(r.prefs, "new_expense"))
        .map((r) => ({
          userId: r.id,
          type: "new_expense" as const,
          title,
          body,
          href: "/expensas",
        })),
    );
  });
}

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
};

export async function getRecentNotifications(
  userId: string,
  limit = 15,
): Promise<NotificationItem[]> {
  return db
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      body: notifications.body,
      href: notifications.href,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), isNull(notifications.readAt)),
    );
  return Number(row?.count ?? 0);
}
