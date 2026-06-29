import "server-only";
import { cookies } from "next/headers";
import { inArray } from "drizzle-orm";
import { db } from "./db";
import { consorcios } from "./db/schema";
import type { CurrentUser } from "./session";

export const CURRENT_CONSORCIO_COOKIE = "current_consorcio";

export type ConsorcioRef = { id: string; name: string };

function membershipConsorcioIds(user: CurrentUser): string[] {
  return Array.from(
    new Set(
      user.memberships
        .filter((m) => m.consorcioId !== null)
        .map((m) => m.consorcioId as string),
    ),
  );
}

/**
 * Consorcios the user can switch between in the app bar: the ones they belong
 * to (any role). Super admins manage everything, so they see all consorcios.
 */
export async function getAvailableConsorcios(
  user: CurrentUser,
): Promise<ConsorcioRef[]> {
  if (user.isSuperAdmin) {
    return db
      .select({ id: consorcios.id, name: consorcios.name })
      .from(consorcios)
      .orderBy(consorcios.name);
  }

  const ids = membershipConsorcioIds(user);
  if (ids.length === 0) return [];

  return db
    .select({ id: consorcios.id, name: consorcios.name })
    .from(consorcios)
    .where(inArray(consorcios.id, ids))
    .orderBy(consorcios.name);
}

/**
 * The consorcio currently selected by the user, read from the cookie set by
 * `selectConsorcio`. Falls back to the first one available. Returns `null` when
 * the user has no consorcios at all.
 *
 * Downstream queries still guard access by role, so a stale cookie value can
 * never widen what the user is allowed to see.
 */
export async function getCurrentConsorcioId(
  user: CurrentUser,
): Promise<string | null> {
  const store = await cookies();
  const cookieId = store.get(CURRENT_CONSORCIO_COOKIE)?.value ?? null;

  const ids = membershipConsorcioIds(user);

  // Super admins can target any consorcio, so trust the cookie when present.
  if (user.isSuperAdmin) {
    return cookieId ?? ids[0] ?? null;
  }

  if (cookieId && ids.includes(cookieId)) return cookieId;
  return ids[0] ?? null;
}
