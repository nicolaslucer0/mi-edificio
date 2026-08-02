"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  notifications,
  users,
  type NotificationPrefs,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/session";

export async function markAllNotificationsRead(): Promise<void> {
  const user = await requireUser();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(eq(notifications.userId, user.id), isNull(notifications.readAt)),
    );
  revalidatePath("/", "layout");
}

/** Los cinco avisos que la app puede mandar, y el orden en que se muestran. */
export const NOTIFICATION_PREF_KEYS = [
  "newExpense",
  "dueDateReminder",
  "paymentConfirmed",
  "paymentRejected",
  "newClaimToValidate",
] as const satisfies ReadonlyArray<keyof NotificationPrefs>;

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Guarda qué avisos quiere recibir el usuario.
 *
 * Se escriben los cinco valores explícitos, no solo los que cambiaron: la
 * lectura (`prefAllows`) trata "ausente" como "sí", así que guardar parcial
 * dejaría preferencias apagadas que vuelven a prenderse solas.
 */
export async function updateNotificationPrefs(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();

  const prefs = Object.fromEntries(
    NOTIFICATION_PREF_KEYS.map((key) => [key, formData.get(key) === "on"]),
  ) as NotificationPrefs;

  await db
    .update(users)
    .set({ notificationPrefs: prefs })
    .where(eq(users.id, user.id));

  revalidatePath("/cuenta");
  return { ok: true };
}
