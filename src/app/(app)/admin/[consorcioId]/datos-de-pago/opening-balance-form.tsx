"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  updateOpeningBalance,
  type ActionResult,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrencyCents, toDateInputValue } from "@/lib/format";

type Props = {
  consorcioId: string;
  consorcioName: string;
  openingBalanceCents: number;
  openingBalanceDate: Date | null;
};

export function OpeningBalanceForm({
  consorcioId,
  consorcioName,
  openingBalanceCents,
  openingBalanceDate,
}: Readonly<Props>) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(updateOpeningBalance, null);
  const savedPesos = Math.round(openingBalanceCents / 100);
  const [pesos, setPesos] = useState(String(savedPesos));
  // Cuánto se mueve la caja si guarda: el saldo inicial entra entero en la
  // cuenta, así que cambiarlo cambia la plata del consorcio en lo mismo.
  const deltaCents = (Number(pesos || 0) - savedPesos) * 100;

  useEffect(() => {
    if (state?.ok) {
      toast.success("Saldo inicial actualizado.");
      router.refresh();
    }
  }, [state, router]);

  const defaultDate = openingBalanceDate
    ? toDateInputValue(openingBalanceDate)
    : toDateInputValue(new Date());

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="consorcioId" value={consorcioId} />
      <p className="text-sm text-muted-foreground">
        Editando:{" "}
        <span className="font-medium text-foreground">{consorcioName}</span>
      </p>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Cargá la plata que había en la cuenta del consorcio el día que
        empezaste a usar la app. Contá solo lo que estaba en la cuenta, no lo
        que los vecinos debían: cuando paguen, esos pagos se suman solos y, si
        ya los contaste acá, quedan contados dos veces. La caja es este saldo
        más todos los pagos menos todos los gastos.
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="openingBalancePesos" className="text-base">
            Saldo (en pesos)
          </Label>
          <CurrencyInput
            id="openingBalancePesos"
            name="openingBalancePesos"
            value={pesos}
            onValueChange={setPesos}
            placeholder="350.000"
            disabled={pending}
            describedById="openingBalanceDelta"
          />
          {deltaCents !== 0 && (
            <p
              id="openingBalanceDelta"
              className="text-sm leading-relaxed text-muted-foreground"
            >
              Si guardás, la caja del consorcio{" "}
              {deltaCents > 0 ? "sube" : "baja"}{" "}
              <span className="font-semibold text-foreground">
                {formatCurrencyCents(Math.abs(deltaCents))}
              </span>
              .
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="openingBalanceDate" className="text-base">
            Fecha del saldo
          </Label>
          <Input
            id="openingBalanceDate"
            name="openingBalanceDate"
            type="date"
            required
            defaultValue={defaultDate}
            className="h-12 text-base"
            disabled={pending}
          />
        </div>
      </div>

      {state && !state.ok && (
        <p
          role="alert"
          aria-live="polite"
          className="text-sm leading-relaxed text-destructive"
        >
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        disabled={pending || pesos === ""}
        className="h-12 text-base touch-manipulation"
      >
        {pending ? "Guardando…" : "Guardar saldo inicial"}
      </Button>
    </form>
  );
}
