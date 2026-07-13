"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { amenities, amenityReservations } from "@/lib/db/schema";
import { getCurrentUser, type CurrentUser } from "@/lib/session";
import {
  MAX_ACTIVE_RESERVATIONS_PER_AMENITY,
  argNow,
  isUpcoming,
  isValidDay,
} from "@/lib/amenities";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function requireConsorcioAdmin(
  consorcioId: string,
): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.isSuperAdmin) return user;
  const isAdmin = user.memberships.some(
    (m) => m.role === "admin" && m.consorcioId === consorcioId,
  );
  return isAdmin ? user : null;
}

const amenitySchema = z
  .object({
    name: z.string().min(1, "Poné un nombre.").max(80),
    description: z.string().max(300).optional(),
    reservable: z.boolean(),
    openHour: z.coerce.number().int().min(0).max(23),
    closeHour: z.coerce.number().int().min(1).max(24),
    maxHours: z.coerce.number().int().min(1).max(24),
  })
  .refine((d) => d.openHour < d.closeHour, {
    message: "El cierre tiene que ser posterior a la apertura.",
    path: ["closeHour"],
  });

function parseAmenityForm(formData: FormData) {
  return amenitySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    reservable: formData.get("reservable") != null,
    openHour: formData.get("openHour"),
    closeHour: formData.get("closeHour"),
    maxHours: formData.get("maxHours"),
  });
}

export async function createAmenity(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const consorcioId = formData.get("consorcioId")?.toString() ?? "";
  const user = await requireConsorcioAdmin(consorcioId);
  if (!user) return { ok: false, error: "Sin permisos." };

  const parsed = parseAmenityForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }
  const d = parsed.data;
  await db.insert(amenities).values({
    consorcioId,
    name: d.name.trim(),
    description: d.description?.trim() || null,
    reservable: d.reservable,
    openHour: d.openHour,
    closeHour: d.closeHour,
    maxHours: d.maxHours,
  });

  revalidatePath(`/admin/${consorcioId}/amenities`);
  revalidatePath("/amenities");
  return { ok: true };
}

export async function updateAmenity(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const id = formData.get("id")?.toString() ?? "";
  const consorcioId = formData.get("consorcioId")?.toString() ?? "";
  const user = await requireConsorcioAdmin(consorcioId);
  if (!user) return { ok: false, error: "Sin permisos." };

  const [existing] = await db
    .select({ consorcioId: amenities.consorcioId })
    .from(amenities)
    .where(eq(amenities.id, id))
    .limit(1);
  if (!existing || existing.consorcioId !== consorcioId) {
    return { ok: false, error: "La amenity no existe." };
  }

  const parsed = parseAmenityForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }
  const d = parsed.data;
  await db
    .update(amenities)
    .set({
      name: d.name.trim(),
      description: d.description?.trim() || null,
      reservable: d.reservable,
      openHour: d.openHour,
      closeHour: d.closeHour,
      maxHours: d.maxHours,
    })
    .where(eq(amenities.id, id));

  revalidatePath(`/admin/${consorcioId}/amenities`);
  revalidatePath("/amenities");
  return { ok: true };
}

export async function deleteAmenity(amenityId: string): Promise<ActionResult> {
  const [existing] = await db
    .select({ consorcioId: amenities.consorcioId })
    .from(amenities)
    .where(eq(amenities.id, amenityId))
    .limit(1);
  if (!existing) return { ok: false, error: "La amenity no existe." };
  const user = await requireConsorcioAdmin(existing.consorcioId);
  if (!user) return { ok: false, error: "Sin permisos." };

  await db.delete(amenities).where(eq(amenities.id, amenityId));

  revalidatePath(`/admin/${existing.consorcioId}/amenities`);
  revalidatePath("/amenities");
  return { ok: true };
}

export async function createReservation(
  amenityId: string,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "No tenés sesión activa." };

  const [amenity] = await db
    .select({
      consorcioId: amenities.consorcioId,
      reservable: amenities.reservable,
      openHour: amenities.openHour,
      closeHour: amenities.closeHour,
      maxHours: amenities.maxHours,
    })
    .from(amenities)
    .where(eq(amenities.id, amenityId))
    .limit(1);
  if (!amenity) return { ok: false, error: "La amenity no existe." };
  if (!amenity.reservable) {
    return { ok: false, error: "Esta amenity no se puede reservar." };
  }

  const unit = user.memberships.find(
    (m) =>
      m.unitId &&
      m.consorcioId === amenity.consorcioId &&
      (m.role === "owner" || m.role === "tenant"),
  );
  if (!unit?.unitId) {
    return {
      ok: false,
      error: "Solo un propietario o inquilino del consorcio puede reservar.",
    };
  }

  const day = formData.get("day")?.toString() ?? "";
  const startHour = Number.parseInt(
    formData.get("startHour")?.toString() ?? "",
    10,
  );
  const endHour = Number.parseInt(formData.get("endHour")?.toString() ?? "", 10);

  if (!isValidDay(day)) return { ok: false, error: "Elegí una fecha válida." };
  if (
    !Number.isInteger(startHour) ||
    !Number.isInteger(endHour) ||
    startHour >= endHour
  ) {
    return { ok: false, error: "Elegí un rango de horas válido." };
  }
  if (startHour < amenity.openHour || endHour > amenity.closeHour) {
    return { ok: false, error: "Ese horario está fuera de la franja disponible." };
  }
  if (endHour - startHour > amenity.maxHours) {
    return { ok: false, error: `El máximo es ${amenity.maxHours} h por reserva.` };
  }

  const now = argNow();
  if (day < now.day || (day === now.day && startHour <= now.hour)) {
    return { ok: false, error: "No podés reservar en el pasado." };
  }

  const sameDay = await db
    .select({
      startHour: amenityReservations.startHour,
      endHour: amenityReservations.endHour,
    })
    .from(amenityReservations)
    .where(
      and(
        eq(amenityReservations.amenityId, amenityId),
        eq(amenityReservations.day, day),
      ),
    );
  const overlaps = sameDay.some(
    (r) => startHour < r.endHour && endHour > r.startHour,
  );
  if (overlaps) return { ok: false, error: "Esa franja ya está reservada." };

  const mine = await db
    .select({
      day: amenityReservations.day,
      endHour: amenityReservations.endHour,
    })
    .from(amenityReservations)
    .where(
      and(
        eq(amenityReservations.amenityId, amenityId),
        eq(amenityReservations.reservedByUserId, user.id),
      ),
    );
  const activeCount = mine.filter((r) => isUpcoming(r.day, r.endHour, now)).length;
  if (activeCount >= MAX_ACTIVE_RESERVATIONS_PER_AMENITY) {
    return {
      ok: false,
      error: `Ya tenés ${MAX_ACTIVE_RESERVATIONS_PER_AMENITY} reservas activas de esta amenity.`,
    };
  }

  await db.insert(amenityReservations).values({
    amenityId,
    reservedByUserId: user.id,
    unitId: unit.unitId,
    day,
    startHour,
    endHour,
  });

  revalidatePath("/amenities");
  revalidatePath(`/amenities/${amenityId}`);
  return { ok: true };
}

export async function cancelReservation(
  reservationId: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "No tenés sesión activa." };

  const [row] = await db
    .select({
      reservedByUserId: amenityReservations.reservedByUserId,
      amenityId: amenityReservations.amenityId,
      day: amenityReservations.day,
      endHour: amenityReservations.endHour,
      consorcioId: amenities.consorcioId,
    })
    .from(amenityReservations)
    .innerJoin(amenities, eq(amenities.id, amenityReservations.amenityId))
    .where(eq(amenityReservations.id, reservationId))
    .limit(1);
  if (!row) return { ok: false, error: "La reserva no existe." };

  const isOwnReservation = row.reservedByUserId === user.id;
  const isAdmin =
    user.isSuperAdmin ||
    user.memberships.some(
      (m) => m.role === "admin" && m.consorcioId === row.consorcioId,
    );
  if (!isOwnReservation && !isAdmin) {
    return { ok: false, error: "No podés cancelar esta reserva." };
  }
  if (isOwnReservation && !isAdmin && !isUpcoming(row.day, row.endHour)) {
    return { ok: false, error: "Esa reserva ya pasó." };
  }

  await db
    .delete(amenityReservations)
    .where(eq(amenityReservations.id, reservationId));

  revalidatePath("/amenities");
  revalidatePath(`/amenities/${row.amenityId}`);
  return { ok: true };
}
