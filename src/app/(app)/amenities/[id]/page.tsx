import { notFound } from "next/navigation";
import { CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import {
  getAmenityForUser,
  getReservationsForDay,
} from "@/lib/queries/amenities";
import { argNow, isValidDay } from "@/lib/amenities";
import { PageHeader } from "@/components/page-header";
import { AmenityDay } from "@/components/amenity-day";

export const metadata: Metadata = {
  title: "Reservar — Mi edificio",
};

export default async function AmenityPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<{ day?: string }>;
}>) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;

  const amenity = await getAmenityForUser(user, id);
  if (!amenity) notFound();

  const now = argNow();
  const day = sp.day && isValidDay(sp.day) ? sp.day : now.day;
  const reservations = await getReservationsForDay(id, day);

  const isAdmin =
    user.isSuperAdmin ||
    user.memberships.some(
      (m) => m.role === "admin" && m.consorcioId === amenity.consorcioId,
    );
  const hasUnit = user.memberships.some(
    (m) =>
      m.unitId &&
      m.consorcioId === amenity.consorcioId &&
      (m.role === "owner" || m.role === "tenant"),
  );

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <PageHeader
          backHref="/amenities"
          backLabel="Volver a amenities"
          icon={CalendarDays}
          tone="teal"
          title={amenity.name}
          subtitle={amenity.description ?? undefined}
        />
        {!amenity.reservable && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Esta amenity no está habilitada para reservar.
          </p>
        )}
        <AmenityDay
          amenityId={amenity.id}
          openHour={amenity.openHour}
          closeHour={amenity.closeHour}
          maxHours={amenity.maxHours}
          day={day}
          reservations={reservations}
          currentUserId={user.id}
          isAdmin={isAdmin}
          canReserve={amenity.reservable && hasUnit}
          now={now}
        />
      </div>
    </main>
  );
}
