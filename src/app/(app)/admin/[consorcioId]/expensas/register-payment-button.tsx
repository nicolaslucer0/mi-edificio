"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { registerPayment } from "@/lib/actions/admin";
import { formatCurrencyCents } from "@/lib/format";

type Props = {
  expenseId: string;
  amountCents: number;
  paidCents: number;
  label: string;
};

export function RegisterPaymentButton({
  expenseId,
  amountCents,
  paidCents,
  label,
}: Readonly<Props>) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const remaining = Math.max(0, amountCents - paidCents);
  const remainingPesos = String(Math.round(remaining / 100));
  const [pesos, setPesos] = useState(remainingPesos);
  const [error, setError] = useState<string | null>(null);

  // El input es en pesos enteros; si dejó lo que falta tal cual, se manda el
  // saldo exacto para no dejar centavos colgados.
  const enteredCents =
    pesos === remainingPesos ? remaining : Number(pesos || 0) * 100;
  const wouldRemain = Math.max(0, remaining - enteredCents);
  // Si pagó más (o la transferencia cubría otras expensas), el resto pasa a
  // saldo a favor de la unidad y se aplica solo.
  const excessCents = Math.max(0, enteredCents - remaining);

  // Se precarga lo que falta al abrir: después de un pago parcial cambia.
  function handleOpenChange(next: boolean) {
    if (next) {
      setPesos(remainingPesos);
      setError(null);
    }
    setOpen(next);
  }

  function handleSubmit() {
    if (!pesos || enteredCents <= 0) {
      setError("Ingresá cuánto pagó.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await registerPayment(expenseId, enteredCents);
      if (result.ok) {
        toast.success("Pago registrado. Le avisamos a la unidad.");
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => handleOpenChange(true)}
        aria-label={`Registrar pago: ${label}`}
        className="h-11 px-4 text-sm touch-manipulation"
      >
        Registrar pago
      </Button>
      <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Registrar pago</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              <span className="font-semibold text-foreground">{label}</span>
              <br />
              {paidCents > 0
                ? `Ya pagó ${formatCurrencyCents(paidCents)} · falta `
                : "Falta pagar "}
              <span className="font-semibold text-foreground">
                {formatCurrencyCents(remaining)}
              </span>
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogBody className="gap-2">
            <Label htmlFor={`register-${expenseId}`} className="text-sm">
              Monto que pagó
            </Label>
            <CurrencyInput
              id={`register-${expenseId}`}
              name="amount"
              value={pesos}
              onValueChange={(digits) => {
                setPesos(digits);
                setError(null);
              }}
              disabled={pending}
              invalid={Boolean(error)}
              describedById={`register-${expenseId}-hint`}
            />
            <p
              id={`register-${expenseId}-hint`}
              className="text-xs text-muted-foreground leading-relaxed"
            >
              {excessCents > 0 ? (
                <>
                  Cubre lo que falta y quedan{" "}
                  <span className="font-semibold text-foreground">
                    {formatCurrencyCents(excessCents)}
                  </span>{" "}
                  a favor de la unidad, que se usan solos en lo que deba.
                </>
              ) : enteredCents > 0 && wouldRemain > 0 ? (
                <>
                  Va a quedar pendiente{" "}
                  <span className="font-semibold text-foreground">
                    {formatCurrencyCents(wouldRemain)}
                  </span>
                  .
                </>
              ) : (
                "Poné lo que transfirió. Si fue más, lo que sobra queda a favor de la unidad."
              )}
            </p>
            {error && (
              <p
                role="alert"
                className="text-xs text-destructive leading-relaxed"
              >
                {error}
              </p>
            )}
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={pending}
              className="h-12 text-base touch-manipulation"
            >
              {pending ? "Registrando…" : "Registrar pago"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={pending}
              className="h-11 touch-manipulation"
            >
              Cancelar
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}
