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
import { voidPayment } from "@/lib/actions/admin";
import { formatCurrencyCents, formatDate } from "@/lib/format";

type Payment = {
  id: string;
  amountCents: number;
  resolvedAt: Date | null;
  registeredByAdmin: boolean;
  paidByName: string | null;
};

type Props = {
  payments: Payment[];
  label: string;
};

export function VoidPaymentButton({ payments, label }: Readonly<Props>) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (next) setError(null);
    setOpen(next);
  }

  function handleVoid(claimId: string) {
    setError(null);
    startTransition(async () => {
      const result = await voidPayment(claimId);
      if (result.ok) {
        toast.success("Pago anulado. Le avisamos a la unidad.");
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
        aria-label={`Anular pago: ${label}`}
        className="h-11 px-4 text-sm touch-manipulation"
      >
        Anular pago
      </Button>
      <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Anular pago</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              <span className="font-semibold text-foreground">{label}</span>
              <br />
              Si un pago se marcó por error, anulalo y la expensa vuelve a
              figurar con lo que falta.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogBody className="gap-3">
            <ul className="flex flex-col gap-2" aria-label="Pagos confirmados">
              {payments.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 p-3"
                >
                  <div className="flex flex-col gap-0.5">
                    <p className="text-base font-semibold tabular-nums">
                      {formatCurrencyCents(p.amountCents)}
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {p.registeredByAdmin
                        ? "Registrado por la administración"
                        : `Informado por ${p.paidByName ?? "un vecino"}`}
                      {p.resolvedAt && ` · ${formatDate(p.resolvedAt)}`}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => handleVoid(p.id)}
                    disabled={pending}
                    aria-label={`Anular pago de ${formatCurrencyCents(p.amountCents)}`}
                    className="h-11 px-4 text-sm touch-manipulation"
                  >
                    {pending ? "Anulando…" : "Anular"}
                  </Button>
                </li>
              ))}
            </ul>
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
