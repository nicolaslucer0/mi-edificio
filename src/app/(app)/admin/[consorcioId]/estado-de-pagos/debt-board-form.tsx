"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  updateDebtBoardSettings,
  type ActionResult,
} from "@/lib/actions/admin";
import type { DebtVisibility } from "@/lib/queries/debt-board";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  consorcioId: string;
  visibility: DebtVisibility;
  graceDays: number;
  onHome: boolean;
};

const LEVELS: ReadonlyArray<{
  value: DebtVisibility;
  label: string;
  detail: string;
}> = [
  {
    value: "off",
    label: "No mostrar nada",
    detail: "Cada vecino ve solo su propia deuda, como hasta ahora.",
  },
  {
    value: "resumen",
    label: "Solo el resumen",
    detail:
      "Cuántas unidades están al día y cuánto falta cobrar en total. Sin decir quién debe.",
  },
  {
    value: "por_unidad",
    label: "Listado por unidad",
    detail:
      "Además del resumen, qué unidades deben y cuánto. Nunca aparecen nombres.",
  },
];

export function DebtBoardForm({
  consorcioId,
  visibility,
  graceDays,
  onHome,
}: Readonly<Props>) {
  const router = useRouter();
  const [level, setLevel] = useState<DebtVisibility>(visibility);
  const [acknowledged, setAcknowledged] = useState(false);
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(updateDebtBoardSettings, null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Estado de pagos actualizado.");
      router.refresh();
    }
  }, [state, router]);

  // Activar el listado por unidad expone datos de los vecinos entre sí: pide
  // una confirmación explícita, salvo que ya estuviera activo.
  const needsAck = level === "por_unidad" && visibility !== "por_unidad";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="consorcioId" value={consorcioId} />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-base font-medium">
          Qué ven los vecinos
        </legend>
        {LEVELS.map((option) => (
          <label
            key={option.value}
            className="flex items-start gap-3 rounded-lg border border-border/60 p-3 touch-manipulation has-[:checked]:border-primary has-[:checked]:bg-primary/5"
          >
            <input
              type="radio"
              name="visibility"
              value={option.value}
              checked={level === option.value}
              onChange={() => setLevel(option.value)}
              className="mt-0.5 size-4 accent-primary"
              disabled={pending}
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{option.label}</span>
              <span className="text-xs leading-relaxed text-muted-foreground">
                {option.detail}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="graceDays" className="text-base">
          Días de gracia
        </Label>
        <Input
          id="graceDays"
          name="graceDays"
          type="number"
          inputMode="numeric"
          min={0}
          max={90}
          required
          defaultValue={graceDays}
          className="h-12 max-w-32 text-base tabular-nums"
          disabled={pending}
        />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Una unidad recién figura como deudora cuando pasaron estos días desde
          el vencimiento. Así nadie aparece por demorarse unos días.
        </p>
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-border/60 p-3 touch-manipulation has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:disabled]:opacity-50">
        <input
          type="checkbox"
          name="onHome"
          defaultChecked={onHome}
          className="mt-0.5 size-4 accent-primary"
          disabled={pending || level === "off"}
        />
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">
            Mostrar el resumen en la pantalla de inicio
          </span>
          <span className="text-xs leading-relaxed text-muted-foreground">
            En el inicio va solo el resumen. El listado por unidad siempre queda
            dentro de Balance.
          </span>
        </span>
      </label>

      {needsAck && (
        <label className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 touch-manipulation">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-0.5 size-4 accent-destructive"
            disabled={pending}
          />
          <span className="text-sm leading-relaxed">
            Entiendo que cada vecino va a ver qué unidades deben y cuánto,
            incluida la suya.
          </span>
        </label>
      )}

      {state && !state.ok && (
        <p role="alert" className="text-sm text-destructive leading-relaxed">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        disabled={pending || (needsAck && !acknowledged)}
        className="h-12 text-base touch-manipulation"
      >
        {pending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
