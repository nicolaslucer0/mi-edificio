"use server";

import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { sendPushToEndpoint } from "@/lib/push";

export type ActionResult = { ok: true } | { ok: false; error: string };

const subscriptionSchema = z.object({
  endpoint: z.url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

/**
 * Guarda la suscripción de este dispositivo y le manda un push de prueba.
 *
 * La prueba no es un extra: sin ella el vecino no tiene forma de saber si
 * quedó activado.
 */
export async function subscribeToPush(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "La suscripción del navegador no es válida." };
  }

  const userAgent = (await headers()).get("user-agent");

  // El navegador puede reenviar la misma suscripción: el alta es un upsert
  // sobre el endpoint, que es único.
  await db
    .insert(pushSubscriptions)
    .values({
      userId: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.p256dh,
      auth: parsed.data.auth,
      userAgent,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        userId: user.id,
        p256dh: parsed.data.p256dh,
        auth: parsed.data.auth,
        userAgent,
      },
    });

  await sendPushToEndpoint(parsed.data.endpoint, {
    title: "Listo, avisos activados",
    body: "Así te van a llegar las novedades de tu consorcio.",
    href: "/cuenta",
  });

  return { ok: true };
}

export async function unsubscribeFromPush(
  endpoint: string,
): Promise<ActionResult> {
  const user = await requireUser();

  const [existing] = await db
    .select({ id: pushSubscriptions.id, userId: pushSubscriptions.userId })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint))
    .limit(1);

  // Borrar una suscripción ajena dejaría a otro vecino sin avisos.
  if (existing && existing.userId !== user.id) {
    return { ok: false, error: "Esa suscripción no es de este usuario." };
  }

  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));

  return { ok: true };
}
