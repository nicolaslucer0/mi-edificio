"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { claimPayment } from "@/lib/actions/expensas";
import { formatCurrencyCents, formatPeriod } from "@/lib/format";

type Props = {
  expenseId: string;
  period: string;
  amountCents: number;
};

export function ClaimPaymentButton({
  expenseId,
  period,
  amountCents,
}: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await claimPayment(expenseId, formData);
      if (result.ok) {
        toast.success("Listo. El administrador va a validar tu pago.", {
          duration: 5000,
        });
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        aria-label={`Marcar como pagada la expensa de ${formatPeriod(period)}`}
        className="h-11 w-full px-5 text-sm touch-manipulation sm:w-auto"
      >
        Ya pagué
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="gap-3">
            <DialogTitle className="text-lg">¿Marcar como pagada?</DialogTitle>
            <DialogDescription className="leading-relaxed">
              <span className="font-semibold text-foreground">
                {formatPeriod(period)}
              </span>{" "}
              ·{" "}
              <span className="font-semibold text-foreground">
                {formatCurrencyCents(amountCents)}
              </span>
              <br />
              Cuando confirmes, el administrador va a recibir un mail para
              validar el pago contra el extracto bancario.
            </DialogDescription>
          </DialogHeader>
          <form action={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="note" className="text-sm">
                Notas o referencia (opcional)
              </Label>
              <Textarea
                id="note"
                name="note"
                placeholder="Ej. transferí por XXX el 1/5"
                rows={3}
                maxLength={500}
                disabled={isPending}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="h-11 touch-manipulation"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="h-11 touch-manipulation"
              >
                {isPending ? "Confirmando…" : "Sí, ya pagué"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
