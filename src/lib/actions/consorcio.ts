"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import {
  CURRENT_CONSORCIO_COOKIE,
  getAvailableConsorcios,
} from "@/lib/consorcio-context";

export type SelectConsorcioResult = { ok: true } | { ok: false; error: string };

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function selectConsorcio(
  consorcioId: string,
): Promise<SelectConsorcioResult> {
  const user = await requireUser();
  const available = await getAvailableConsorcios(user);

  if (!available.some((c) => c.id === consorcioId)) {
    return { ok: false, error: "No tenés acceso a ese consorcio." };
  }

  const store = await cookies();
  store.set(CURRENT_CONSORCIO_COOKIE, consorcioId, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_YEAR_SECONDS,
  });

  // Re-render every route under the app shell with the new consorcio in scope.
  revalidatePath("/", "layout");

  return { ok: true };
}
