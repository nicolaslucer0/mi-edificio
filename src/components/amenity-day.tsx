"use client";

import { type ChangeEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CancelReservationButton } from "@/components/cancel-reservation-button";
import { createReservation } from "@/lib/actions/amenities";
import { hourLabel } from "@/lib/amenities";

type Reservation = {
  id: string;
  startHour: number;
  endHour: number;
  reservedByUserId: string;
  reservedByName: string | null;
  unitLabel: string | null;
};

type Props = {
  amenityId: string;
  openHour: number;
  closeHour: number;
  maxHours: number;
  day: string;
  reservations: Reservation[];
  currentUserId: string;
  isAdmin: boolean;
  canReserve: boolean;
  now: { day: string; hour: number };
};

export function AmenityDay({
  amenityId,
  openHour,
  closeHour,
  maxHours,
  day,
  reservations,
  currentUserId,
  isAdmin,
  canReserve,
  now,
}: Readonly<Props>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [desde, setDesde] = useState<string>("");
  const [hasta, setHasta] = useState<string>("");

  const minStart = day === now.day ? Math.max(openHour, now.hour + 1) : openHour;

  const desdeOptions = useMemo(() => {
    const opts: number[] = [];
    for (let h = minStart; h < closeHour; h += 1) opts.push(h);
    return opts;
  }, [minStart, closeHour]);

  const hastaOptions = useMemo(() => {
    if (desde === "") return [];
    const s = Number(desde);
    const max = Math.min(s + maxHours, closeHour);
    const opts: number[] = [];
    for (let h = s + 1; h <= max; h += 1) opts.push(h);
    return opts;
  }, [desde, maxHours, closeHour]);

  function handleDayChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.value) {
      router.push(`/amenities/${amenityId}?day=${e.target.value}`);
    }
  }

  function handleSubmit(formData: FormData) {
    if (desde === "" || hasta === "") {
      toast.error("Elegí desde y hasta qué hora.");
      return;
    }
    formData.set("day", day);
    formData.set("startHour", desde);
    formData.set("endHour", hasta);
    startTransition(async () => {
      const result = await createReservation(amenityId, formData);
      if (result.ok) {
        toast.success("¡Reservado!");
        setDesde("");
        setHasta("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="day" className="text-sm">
          Fecha
        </Label>
        <Input
          id="day"
          type="date"
          value={day}
          min={now.day}
          onChange={handleDayChange}
          className="h-12 text-base"
        />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Reservas del día
        </h2>
        {reservations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Libre todo el día.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {reservations.map((r) => {
              const upcoming =
                day > now.day || (day === now.day && r.endHour > now.hour);
              const mine = r.reservedByUserId === currentUserId;
              const canCancel = upcoming && (isAdmin || mine);
              return (
                <li key={r.id}>
                  <Card>
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold tabular-nums">
                          {hourLabel(r.startHour)}–{hourLabel(r.endHour)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {mine ? "Vos" : (r.reservedByName ?? "Vecino")}
                          {r.unitLabel ? ` · Unidad ${r.unitLabel}` : ""}
                        </p>
                      </div>
                      {canCancel && (
                        <CancelReservationButton reservationId={r.id} />
                      )}
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {canReserve ? (
        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <h2 className="text-base font-semibold">Reservar una franja</h2>
            {desdeOptions.length > 0 ? (
              <form action={handleSubmit} className="flex flex-col gap-4">
                <div className="flex gap-3">
                  <div className="flex flex-1 flex-col gap-2">
                    <Label htmlFor="desde" className="text-sm">
                      Desde
                    </Label>
                    <select
                      id="desde"
                      value={desde}
                      onChange={(e) => {
                        setDesde(e.target.value);
                        setHasta("");
                      }}
                      disabled={isPending}
                      className="h-12 rounded-md border border-input bg-background px-3 text-base"
                    >
                      <option value="">--</option>
                      {desdeOptions.map((h) => (
                        <option key={h} value={h}>
                          {hourLabel(h)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    <Label htmlFor="hasta" className="text-sm">
                      Hasta
                    </Label>
                    <select
                      id="hasta"
                      value={hasta}
                      onChange={(e) => setHasta(e.target.value)}
                      disabled={isPending || desde === ""}
                      className="h-12 rounded-md border border-input bg-background px-3 text-base"
                    >
                      <option value="">--</option>
                      {hastaOptions.map((h) => (
                        <option key={h} value={h}>
                          {hourLabel(h)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Hasta {maxHours} h por reserva. Horario disponible:{" "}
                  {hourLabel(openHour)}–{hourLabel(closeHour)}.
                </p>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="h-12 text-base touch-manipulation"
                >
                  {isPending ? "Reservando…" : "Reservar"}
                </Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">
                No quedan horas para reservar en esta fecha.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Solo los propietarios e inquilinos del consorcio pueden reservar.
        </p>
      )}
    </div>
  );
}
