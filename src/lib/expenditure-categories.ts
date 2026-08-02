import {
  Briefcase,
  Hammer,
  Shield,
  Sparkles,
  Tag,
  Trees,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { ExpenditureCategory } from "@/lib/format";
import type { Tone } from "@/lib/tones";

export const CATEGORY_ICON: Record<ExpenditureCategory, LucideIcon> = {
  limpieza: Sparkles,
  mantenimiento: Wrench,
  jardineria: Trees,
  seguridad: Shield,
  servicios: Zap,
  obras: Hammer,
  administracion: Briefcase,
  otros: Tag,
};

/**
 * Color de reconocimiento de cada categoría: el mismo en el filtro y en el
 * badge de la lista, para que se enganchen de un vistazo. `null` = neutro.
 *
 * Hay seis tonos y ocho categorías: en vez de repetir un color (dos categorías
 * del mismo color se confunden), las dos que quedan van en neutro. El nombre
 * está escrito siempre, así que el color nunca es lo único que las distingue.
 */
export const CATEGORY_TONE: Record<ExpenditureCategory, Tone | null> = {
  limpieza: "teal",
  mantenimiento: "blue",
  jardineria: "green",
  seguridad: "coral",
  servicios: "violet",
  obras: "amber",
  administracion: null,
  otros: null,
};
