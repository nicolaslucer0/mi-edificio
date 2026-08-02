import "server-only";
import webpush from "web-push";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { reportError } from "@/lib/observability";

/**
 * Envío de notificaciones push. Ver docs/notificaciones-push.md.
 *
 * Las claves VAPID identifican al servidor ante el servicio de push del
 * navegador. Si no están configuradas, el push queda apagado y la app sigue
 * andando igual: la campanita y los mails no dependen de esto.
 */
const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@mi-edificio.app";

export function isPushConfigured(): boolean {
  return Boolean(PUBLIC_KEY && PRIVATE_KEY);
}

let configured = false;
function ensureConfigured(): boolean {
  if (!isPushConfigured()) return false;
  if (!configured) {
    webpush.setVapidDetails(SUBJECT, PUBLIC_KEY!, PRIVATE_KEY!);
    configured = true;
  }
  return true;
}

export type PushPayload = {
  title: string;
  body: string | null;
  /** A dónde lleva el tap. */
  href: string | null;
};

/** El navegador ya no conoce este endpoint: la suscripción murió. */
function isGone(statusCode: number | undefined): boolean {
  return statusCode === 404 || statusCode === 410;
}

/**
 * Manda un push a todos los dispositivos de estos usuarios.
 *
 * Nunca lanza: si el push falla, la operación que lo disparó (crear una
 * expensa, aprobar un pago) ya se completó y no tiene por qué caerse. Las
 * suscripciones muertas se borran en el momento, sin reintentos.
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<void> {
  if (userIds.length === 0 || !ensureConfigured()) return;

  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(inArray(pushSubscriptions.userId, userIds));
  if (subscriptions.length === 0) return;

  const message = JSON.stringify(payload);
  const dead: string[] = [];

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          message,
        );
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (isGone(statusCode)) {
          dead.push(subscription.id);
          return;
        }
        reportError(error, {
          scope: "push",
          endpoint: subscription.endpoint,
          statusCode,
        });
      }
    }),
  );

  if (dead.length > 0) {
    await db
      .delete(pushSubscriptions)
      .where(inArray(pushSubscriptions.id, dead));
  }
}

/** Un push suelto, para el "probar" del alta. */
export async function sendPushToEndpoint(
  endpoint: string,
  payload: PushPayload,
): Promise<void> {
  if (!ensureConfigured()) return;

  const [subscription] = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint))
    .limit(1);
  if (!subscription) return;

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
    );
  } catch (error) {
    reportError(error, { scope: "push-test", endpoint });
  }
}
