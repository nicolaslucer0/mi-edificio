import Link from "next/link";
import { CalendarDays, ChevronRight, Clock } from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getCurrentConsorcioId } from "@/lib/consorcio-context";
import {
  getAmenitiesForConsorcio,
  getUpcomingReservationsForUser,
  type Amenity,
  type MyReservation,
} from "@/lib/queries/amenities";
import { formatDayLabel, hourLabel } from "@/lib/amenities";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { CancelReservationButton } from "@/components/cancel-reservation-button";

export const metadata: Metadata = {
  title: "Amenities — Mi edificio",
};

export default async function AmenitiesPage() {
  const user = await requireUser();
  const consorcioId = await getCurrentConsorcioId(user);

  let amenities: Amenity[] = [];
  let myReservations: MyReservation[] = [];
  if (consorcioId) {
    [amenities, myReservations] = await Promise.all([
      getAmenitiesForConsorcio(consorcioId),
      getUpcomingReservationsForUser(user, consorcioId),
    ]);
  }
  const reservable = amenities.filter((a) => a.reservable);

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <PageHeader
          backHref="/"
          backLabel="Volver al inicio"
          icon={CalendarDays}
          tone="teal"
          title="Amenities"
        />

        {myReservations.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Tus reservas
            </h2>
            <ul className="flex flex-col gap-2">
              {myReservations.map((r) => (
                <li key={r.id}>
                  <Card>
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {r.amenityName}
                        </p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {formatDayLabel(r.day)} · {hourLabel(r.startHour)}–
                          {hourLabel(r.endHour)}
                        </p>
                      </div>
                      <CancelReservationButton reservationId={r.id} />
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        )}

        {reservable.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            tone="teal"
            title="Sin amenities para reservar"
            description="Cuando el administrador cargue espacios reservables, van a aparecer acá."
          />
        ) : (
          <ul className="flex flex-col gap-2" aria-label="Amenities">
            {reservable.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/amenities/${a.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border/50 bg-background p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-spot-teal-soft text-spot-teal"
                  >
                    <CalendarDays className="size-5" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-base font-semibold">
                      {a.name}
                    </span>
                    <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                      <Clock aria-hidden="true" className="size-3.5" />
                      {hourLabel(a.openHour)}–{hourLabel(a.closeHour)}
                    </span>
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className="size-5 shrink-0 text-muted-foreground"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
