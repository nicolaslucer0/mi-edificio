/**
 * Paleta de tonos de sección: el mismo código de colores para los headers de
 * pantalla (`PageHeader`) y los widgets del home (`WidgetCard`).
 */
export type Tone = "violet" | "blue" | "green" | "amber" | "coral" | "teal";

// Clases completas (no interpolar): Tailwind necesita verlas literales.
export const TILE_TONES: Record<Tone, string> = {
  violet: "bg-spot-violet-soft text-spot-violet",
  blue: "bg-spot-blue-soft text-spot-blue",
  green: "bg-spot-green-soft text-spot-green",
  amber: "bg-spot-amber-soft text-spot-amber",
  coral: "bg-spot-coral-soft text-spot-coral",
  teal: "bg-spot-teal-soft text-spot-teal",
};
