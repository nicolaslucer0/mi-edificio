"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  updateOpeningBalance,
  type ActionResult,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  consorcioId: string;
  consorcioName: string;
  openingBalanceCents: number;
  openingBalanceDate: Date | null;
};

function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

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
      <p className="text-xs leading-relaxed text-muted-foreground">
        Cargá la plata que tiene la caja del consorcio a la fecha que elijas. Se
        usa como base del balance: a partir de ahí se suman las expensas
        cobradas y se restan los gastos.
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="openingBalancePesos" className="text-base">
            Saldo (en pesos)
          </Label>
          <Input
            id="openingBalancePesos"
            name="openingBalancePesos"
            type="number"
            required
            min={0}
            step={1}
            defaultValue={Math.round(openingBalanceCents / 100)}
            placeholder="350000"
            className="h-12 text-base tabular-nums"
            disabled={pending}
          />
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
        disabled={pending}
        className="h-12 text-base touch-manipulation"
      >
        {pending ? "Guardando…" : "Guardar saldo inicial"}
      </Button>
    </form>
  );
}
