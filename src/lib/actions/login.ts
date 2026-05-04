"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export type LoginState = { error: string } | null;

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const rawEmail = formData.get("email");
  const email =
    typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

  if (!email) {
    return { error: "Ingresá tu email." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Ese email no parece válido. Revisá que esté bien escrito." };
  }

  try {
    await signIn("resend", { email, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error:
          "No encontramos ese email en el sistema. Pedile al administrador del consorcio que te dé acceso.",
      };
    }
    throw error;
  }

  return null;
}
