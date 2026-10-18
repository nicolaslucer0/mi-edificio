import "server-only";
import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  consorcios,
  memberships,
  units,
  users,
  type NotificationPrefs,
} from "@/lib/db/schema";
import type { CurrentUser } from "@/lib/session";
import { getAccessibleConsorcioIds } from "./admin";

/**
 * Las preferencias de avisos del usuario.
 *
 * Va aparte de `getCurrentUser` a propósito: esa corre en cada request de la
 * app y hoy no toca la tabla `user`. Sumarle una consulta por una pantalla que
 * se abre una vez cada tanto sería pagarla en todas las demás.
 */
export async function getNotificationPrefs(
  userId: string,
): Promise<NotificationPrefs | null> {
  const [row] = await db
    .select({ prefs: users.notificationPrefs })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.prefs ?? null;
}

type Role = "super_admin" | "admin" | "owner" | "tenant";

export type UserMembershipRow = {
  membershipId: string;
  role: Role;
  consorcioId: string | null;
  consorcioName: string | null;
  unitId: string | null;
  unitLabel: string | null;
  unitFloor: string | null;
};

export type UserWithMemberships = {
  id: string;
  email: string;
  name: string | null;
  memberships: UserMembershipRow[];
};

function pickVisibleConsorcioIds(
  ids: "all" | string[],
  consorcioId: string | undefined,
): string[] | null {
  if (consorcioId) return [consorcioId];
  if (ids === "all") return null;
  return ids;
}

export async function getUsersForAdmin(
  user: CurrentUser,
  options: { consorcioId?: string } = {},
): Promise<UserWithMemberships[]> {
  const ids = getAccessibleConsorcioIds(user);
  if (ids !== "all" && ids.length === 0) return [];

  const { consorcioId } = options;
  if (consorcioId && ids !== "all" && !ids.includes(consorcioId)) {
    return [];
  }

  const visibleConsorcioIds = pickVisibleConsorcioIds(ids, consorcioId);

  const scopedUserIdsRows = visibleConsorcioIds
    ? await db
        .selectDistinct({ id: memberships.userId })
        .from(memberships)
        .where(inArray(memberships.consorcioId, visibleConsorcioIds))
    : await db
        .select({ id: users.id })
        .from(users)
        .where(isNotNull(users.email));

  const scopedUserIds = scopedUserIdsRows.map((r) => r.id);
  if (scopedUserIds.length === 0) return [];

  const userRows = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(inArray(users.id, scopedUserIds))
    .orderBy(asc(users.email));

  const membershipWhere = visibleConsorcioIds
    ? and(
        inArray(memberships.userId, scopedUserIds),
        inArray(memberships.consorcioId, visibleConsorcioIds),
      )
    : inArray(memberships.userId, scopedUserIds);

  const membershipRows = await db
    .select({
      membershipId: memberships.id,
      userId: memberships.userId,
      role: memberships.role,
      consorcioId: memberships.consorcioId,
      consorcioName: consorcios.name,
      unitId: memberships.unitId,
      unitLabel: units.label,
      unitFloor: units.floor,
    })
    .from(memberships)
    .leftJoin(consorcios, eq(consorcios.id, memberships.consorcioId))
    .leftJoin(units, eq(units.id, memberships.unitId))
    .where(membershipWhere);

  const byUser = new Map<string, UserMembershipRow[]>();
  for (const row of membershipRows) {
    const list = byUser.get(row.userId) ?? [];
    list.push({
      membershipId: row.membershipId,
      role: row.role,
      consorcioId: row.consorcioId,
      consorcioName: row.consorcioName,
      unitId: row.unitId,
      unitLabel: row.unitLabel,
      unitFloor: row.unitFloor,
    });
    byUser.set(row.userId, list);
  }

  return userRows
    .filter((u) => u.email)
    .map((u) => ({
      id: u.id,
      email: u.email as string,
      name: u.name,
      memberships: byUser.get(u.id) ?? [],
    }));
}
