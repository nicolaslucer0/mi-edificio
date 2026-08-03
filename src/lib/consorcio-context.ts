import "server-only";
import { cookies } from "next/headers";
import { unstable_cache } from "next/cache";
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
 * Tag del cache de consorcios. Se invalida al crear uno o al cambiarle el
 * nombre, que es lo único cacheado acá.
 */
export const CONSORCIOS_TAG = "consorcios";

/**
 * Nombres de los consorcios pedidos, o de todos si `ids` es null.
 *
 * Ojo con por qué esto es seguro de cachear: **la clave del cache es la lista
 * de ids**, que es justamente el resultado de la autorización. Si a alguien le
 * quitan una membresía, la lista que se pasa cambia y con ella la clave: no
 * hay forma de que siga viendo un consorcio que ya no le corresponde. Lo único
 * que el cache guarda son ids y nombres de consorcios que el llamador ya
 * decidió que puede ver.
 */
const getCachedConsorcios = unstable_cache(
  async (ids: string[] | null): Promise<ConsorcioRef[]> => {
    const query = db
      .select({ id: consorcios.id, name: consorcios.name })
      .from(consorcios);
    if (ids) query.where(inArray(consorcios.id, ids));
    return query.orderBy(consorcios.name);
  },
  ["available-consorcios"],
  { tags: [CONSORCIOS_TAG] },
);

/**
 * Consorcios the user can switch between in the app bar: the ones they belong
 * to (any role). Super admins manage everything, so they see all consorcios.
 *
 * Corría en cada request del layout para traer un nombre que cambia cuando se
 * crea o se renombra un consorcio.
 */
export async function getAvailableConsorcios(
  user: CurrentUser,
): Promise<ConsorcioRef[]> {
  if (user.isSuperAdmin) return getCachedConsorcios(null);

  const ids = membershipConsorcioIds(user);
  if (ids.length === 0) return [];
  // Ordenado para que dos requests con las mismas membresías compartan la
  // entrada del cache en vez de generar una por cada permutación.
  return getCachedConsorcios([...ids].sort());
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
