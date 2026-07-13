export const MAX_ACTIVE_RESERVATIONS_PER_AMENITY = 2;

const TZ = "America/Argentina/Buenos_Aires";

/** Fecha ("YYYY-MM-DD") y hora actuales en zona horaria de Argentina. */
export function argNow(): { day: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hour = Number(get("hour")) % 24;
  return { day: `${get("year")}-${get("month")}-${get("day")}`, hour };
}

/** Etiqueta de hora entera: 14 → "14:00". */
export function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

/** Etiqueta corta de día: "2026-07-20" → "20/07". */
export function formatDayLabel(day: string): string {
  const [, month, dayNum] = day.split("-");
  return `${dayNum}/${month}`;
}

/** Una reserva sigue activa (no terminó) respecto de `now`. */
export function isUpcoming(
  day: string,
  endHour: number,
  now: { day: string; hour: number } = argNow(),
): boolean {
  if (day > now.day) return true;
  if (day < now.day) return false;
  return endHour > now.hour;
}

export function isValidDay(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value);
}
