"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  updateNotificationPrefs,
  type ActionResult,
} from "@/lib/actions/notifications";
import type { NotificationPrefs } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";

type PrefKey = keyof NotificationPrefs;

const OPTIONS: ReadonlyArray<{
  key: PrefKey;
  label: string;
  hint: string;
  /** Solo tiene sentido para quien administra un consorcio. */
  adminOnly?: boolean;
}> = [
  {
    key: "newExpense",
    label: "Nueva expensa",
    hint: "Cuando el administrador carga la expensa del mes.",
  },
  {
    key: "dueDateReminder",
    label: "Aviso de vencimiento",
    hint: "El día anterior al vencimiento, si todavía no pagaste.",
  },
  {
    key: "paymentConfirmed",
    label: "Pago confirmado",
    hint: "Cuando el administrador valida tu pago.",
  },
  {
    key: "paymentRejected",
    label: "Pago rechazado",
    hint: "Cuando tu pago no se pudo validar, con el motivo.",
  },
  {
    key: "newClaimToValidate",
    label: "Pagos por validar",
    hint: "Cuando un vecino informa que pagó y falta que lo valides.",
    adminOnly: true,
  },
];

/**
 * Qué avisos recibe el usuario, por mail y por push.
 *
 * La preferencia ausente vale como "sí": es lo que hace `prefAllows` en el
 * servidor y es el default correcto (nadie se pierde un aviso por no haber
 * entrado nunca acá).
 */
export function NotificationPrefsForm({
  prefs,
  isAdmin,
}: Readonly<{ prefs: NotificationPrefs | null; isAdmin: boolean }>) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(updateNotificationPrefs, null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Preferencias guardadas.");
      router.refresh();
    }
  }, [state, router]);

  const visible = OPTIONS.filter((o) => !o.adminOnly || isAdmin);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {visible.map((option) => (
          <li key={option.key}>
            <label className="flex items-start gap-3 rounded-lg border border-border/60 p-3 touch-manipulation has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input
                type="checkbox"
                name={option.key}
                defaultChecked={prefs?.[option.key] !== false}
                className="mt-0.5 size-4 accent-primary"
                disabled={pending}
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{option.label}</span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  {option.hint}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>

      {/* El admin no ve la opción de "pagos por validar", pero su valor
          guardado tiene que sobrevivir al guardado: va como campo oculto. */}
      {!isAdmin && prefs?.newClaimToValidate !== false && (
        <input type="hidden" name="newClaimToValidate" value="on" />
      )}

      {state && !state.ok && (
        <p role="alert" className="text-sm leading-relaxed text-destructive">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="h-12 self-start px-5 text-base touch-manipulation"
      >
        {pending ? "Guardando…" : "Guardar preferencias"}
      </Button>
    </form>
  );
}
