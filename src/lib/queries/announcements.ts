import "server-only";
import { and, desc, eq, inArray, isNull, or, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { announcements, units, users } from "@/lib/db/schema";
import type { CurrentUser } from "@/lib/session";
import { getViewableConsorcioIds } from "./expenditures";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  /** Null cuando el aviso fue para todo el consorcio. */
  unitLabel: string | null;
  emailSent: boolean;
  authorName: string | null;
  createdAt: Date;
};

const COLUMNS = {
  id: announcements.id,
  title: announcements.title,
  body: announcements.body,
  unitLabel: units.label,
  emailSent: announcements.emailSent,
  authorName: users.name,
  createdAt: announcements.createdAt,
} as const;

/** Las unidades del usuario en un consorcio. Un aviso dirigido a una unidad
 *  solo lo ve quien vive ahí. */
function userUnitIds(user: CurrentUser, consorcioId: string): string[] {
  return Array.from(
    new Set(
      user.memberships
        .filter((m) => m.consorcioId === consorcioId && m.unitId !== null)
        .map((m) => m.unitId as string),
    ),
  );
}

/**
 * Los comunicados que le corresponden al vecino: los del consorcio entero más
 * los dirigidos a alguna de sus unidades.
 *
 * El filtro por unidad es la parte importante: un aviso al 3° B no puede
 * aparecerle al 5° A.
 */
export async function getAnnouncementsForUser(
  user: CurrentUser,
  consorcioId: string | null,
  limit = 30,
): Promise<Announcement[]> {
  if (!consorcioId) return [];

  const viewable = getViewableConsorcioIds(user);
  if (viewable !== "all" && !viewable.includes(consorcioId)) return [];

  const myUnits = userUnitIds(user, consorcioId);
  // Un admin sin unidades ve los generales; un vecino, los suyos también.
  const audience: SQL | undefined =
    myUnits.length > 0
      ? or(isNull(announcements.unitId), inArray(announcements.unitId, myUnits))
      : isNull(announcements.unitId);

  return db
    .select(COLUMNS)
    .from(announcements)
    .leftJoin(units, eq(units.id, announcements.unitId))
    .innerJoin(users, eq(users.id, announcements.createdByUserId))
    .where(and(eq(announcements.consorcioId, consorcioId), audience))
    .orderBy(desc(announcements.createdAt))
    .limit(limit);
}

/** Todos los del consorcio, para el panel del admin. El caller valida acceso. */
export async function getAnnouncementsForAdmin(
  consorcioId: string,
  limit = 50,
): Promise<Announcement[]> {
  return db
    .select(COLUMNS)
    .from(announcements)
    .leftJoin(units, eq(units.id, announcements.unitId))
    .innerJoin(users, eq(users.id, announcements.createdByUserId))
    .where(eq(announcements.consorcioId, consorcioId))
    .orderBy(desc(announcements.createdAt))
    .limit(limit);
}
