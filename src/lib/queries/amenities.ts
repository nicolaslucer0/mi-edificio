import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { amenities, amenityReservations, units, users } from "@/lib/db/schema";
import type { CurrentUser } from "@/lib/session";
import { argNow, isUpcoming } from "@/lib/amenities";

export type Amenity = {
  id: string;
  consorcioId: string;
  name: string;
  description: string | null;
  reservable: boolean;
  openHour: number;
  closeHour: number;
  maxHours: number;
};

const AMENITY_COLUMNS = {
  id: amenities.id,
  consorcioId: amenities.consorcioId,
  name: amenities.name,
  description: amenities.description,
  reservable: amenities.reservable,
  openHour: amenities.openHour,
  closeHour: amenities.closeHour,
  maxHours: amenities.maxHours,
} as const;

function isConsorcioMember(user: CurrentUser, consorcioId: string): boolean {
  if (user.isSuperAdmin) return true;
  return user.memberships.some((m) => m.consorcioId === consorcioId);
}

/** ¿El consorcio tiene al menos una amenity reservable? Para mostrar la nav. */
export async function hasReservableAmenities(
  consorcioId: string | null,
): Promise<boolean> {
  if (!consorcioId) return false;
  const [row] = await db
    .select({ id: amenities.id })
    .from(amenities)
    .where(
      and(
        eq(amenities.consorcioId, consorcioId),
        eq(amenities.reservable, true),
      ),
    )
    .limit(1);
  return row != null;
}

/** Todas las amenities de un consorcio. El caller valida acceso al consorcio. */
export async function getAmenitiesForConsorcio(
  consorcioId: string,
): Promise<Amenity[]> {
  return db
    .select(AMENITY_COLUMNS)
    .from(amenities)
    .where(eq(amenities.consorcioId, consorcioId))
    .orderBy(asc(amenities.name));
}

/** Una amenity, solo si el usuario es miembro de su consorcio. */
export async function getAmenityForUser(
  user: CurrentUser,
  amenityId: string,
): Promise<Amenity | null> {
  const [row] = await db
    .select(AMENITY_COLUMNS)
    .from(amenities)
    .where(eq(amenities.id, amenityId))
    .limit(1);
  if (!row) return null;
  if (!isConsorcioMember(user, row.consorcioId)) return null;
  return row;
}

export type DayReservation = {
  id: string;
  startHour: number;
  endHour: number;
  reservedByUserId: string;
  reservedByName: string | null;
  unitLabel: string | null;
};

/** Reservas de una amenity en un día, con quién y qué unidad. */
export async function getReservationsForDay(
  amenityId: string,
  day: string,
): Promise<DayReservation[]> {
  return db
    .select({
      id: amenityReservations.id,
      startHour: amenityReservations.startHour,
      endHour: amenityReservations.endHour,
      reservedByUserId: amenityReservations.reservedByUserId,
      reservedByName: users.name,
      unitLabel: units.label,
    })
    .from(amenityReservations)
    .innerJoin(users, eq(users.id, amenityReservations.reservedByUserId))
    .leftJoin(units, eq(units.id, amenityReservations.unitId))
    .where(
      and(
        eq(amenityReservations.amenityId, amenityId),
        eq(amenityReservations.day, day),
      ),
    )
    .orderBy(asc(amenityReservations.startHour));
}

export type MyReservation = {
  id: string;
  amenityId: string;
  amenityName: string;
  day: string;
  startHour: number;
  endHour: number;
};

/** Reservas futuras (activas) del usuario, opcionalmente en un consorcio. */
export async function getUpcomingReservationsForUser(
  user: CurrentUser,
  consorcioId?: string | null,
): Promise<MyReservation[]> {
  const rows = await db
    .select({
      id: amenityReservations.id,
      amenityId: amenityReservations.amenityId,
      amenityName: amenities.name,
      day: amenityReservations.day,
      startHour: amenityReservations.startHour,
      endHour: amenityReservations.endHour,
    })
    .from(amenityReservations)
    .innerJoin(amenities, eq(amenities.id, amenityReservations.amenityId))
    .where(
      consorcioId
        ? and(
            eq(amenityReservations.reservedByUserId, user.id),
            eq(amenities.consorcioId, consorcioId),
          )
        : eq(amenityReservations.reservedByUserId, user.id),
    )
    .orderBy(asc(amenityReservations.day), asc(amenityReservations.startHour));

  return rows.filter((r) => isUpcoming(r.day, r.endHour));
}

/** Cantidad de reservas futuras por amenity, para avisar antes de borrar. */
export async function getUpcomingReservationCounts(
  consorcioId: string,
): Promise<Record<string, number>> {
  const rows = await db
    .select({
      amenityId: amenityReservations.amenityId,
      day: amenityReservations.day,
      endHour: amenityReservations.endHour,
    })
    .from(amenityReservations)
    .innerJoin(amenities, eq(amenities.id, amenityReservations.amenityId))
    .where(eq(amenities.consorcioId, consorcioId));

  const now = argNow();
  const counts: Record<string, number> = {};
  for (const r of rows) {
    if (isUpcoming(r.day, r.endHour, now)) {
      counts[r.amenityId] = (counts[r.amenityId] ?? 0) + 1;
    }
  }
  return counts;
}
