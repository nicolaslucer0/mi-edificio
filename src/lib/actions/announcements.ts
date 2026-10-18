"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { announcements, consorcios, units } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/session";
import { notifyAnnouncement } from "@/lib/notifications";
import { getAnnouncementEmails, sendAnnouncementEmail } from "@/lib/email";
import { reportError } from "@/lib/observability";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Un comunicado que no entra en 2000 caracteres es un PDF, no un aviso. */
const announcementSchema = z.object({
  consorcioId: z.uuid(),
  unitId: z.union([z.uuid(), z.literal("")]).optional(),
  title: z.string().min(1, "Poné un título.").max(120, "El título es muy largo."),
  body: z
    .string()
    .min(1, "Escribí el aviso.")
    .max(2000, "El aviso es muy largo: máximo 2000 caracteres."),
  sendEmail: z.boolean(),
});

export async function createAnnouncement(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sin permisos." };

  const parsed = announcementSchema.safeParse({
    consorcioId: formData.get("consorcioId"),
    unitId: formData.get("unitId") ?? "",
    title: formData.get("title"),
    body: formData.get("body"),
    sendEmail: formData.get("sendEmail") === "on",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }
  const { consorcioId, title, body, sendEmail } = parsed.data;

  const isConsorcioAdmin =
    user.isSuperAdmin ||
    user.memberships.some(
      (m) => m.role === "admin" && m.consorcioId === consorcioId,
    );
  if (!isConsorcioAdmin) {
    return { ok: false, error: "No tenés permisos sobre ese consorcio." };
  }

  // Una unidad vacía significa "todo el consorcio".
  const unitId = parsed.data.unitId ? parsed.data.unitId : null;
  if (unitId) {
    const [unit] = await db
      .select({ consorcioId: units.consorcioId })
      .from(units)
      .where(eq(units.id, unitId))
      .limit(1);
    if (!unit) return { ok: false, error: "La unidad no existe." };
    if (unit.consorcioId !== consorcioId) {
      return { ok: false, error: "La unidad no pertenece a ese consorcio." };
    }
  }

  const cleanTitle = title.trim();
  const cleanBody = body.trim();

  // El mail se manda antes de guardar `emailSent`, para que la columna refleje
  // lo que de verdad pasó y no lo que se pidió.
  let emailSent = false;
  if (sendEmail) {
    try {
      const [to, consorcioName] = await Promise.all([
        getAnnouncementEmails({
          consorcioId,
          unitId,
          excludeUserId: user.id,
        }),
        consorcioNameFor(consorcioId),
      ]);
      await sendAnnouncementEmail({
        to,
        consorcioName,
        title: cleanTitle,
        body: cleanBody,
      });
      emailSent = to.length > 0;
    } catch (e) {
      // Que falle el mail no invalida el comunicado: la campanita y el push
      // salen igual.
      reportError(e, { scope: "announcement-email", consorcioId });
    }
  }

  await db.insert(announcements).values({
    consorcioId,
    unitId,
    title: cleanTitle,
    body: cleanBody,
    emailSent,
    createdByUserId: user.id,
  });

  await notifyAnnouncement({
    consorcioId,
    unitId,
    title: cleanTitle,
    body: cleanBody,
    authorUserId: user.id,
  });

  revalidatePath("/comunicados");
  revalidatePath("/admin", "layout");
  revalidatePath("/");
  return { ok: true };
}

async function consorcioNameFor(consorcioId: string): Promise<string> {
  const [row] = await db
    .select({ name: consorcios.name })
    .from(consorcios)
    .where(eq(consorcios.id, consorcioId))
    .limit(1);
  return row?.name ?? "tu consorcio";
}
