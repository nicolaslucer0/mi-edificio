"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    setSubmitted(true);
    setOpen(false);
    startTransition(async () => {
      const result = await claimPayment(expenseId, formData);
      if (result.ok) {
        toast.success("Listo. El administrador va a validar tu pago.", {
          duration: 5000,
        });
        router.refresh();
      } else {
        setSubmitted(false);
        toast.error(result.error);
      }
    });
  }

  if (submitted) {
    return (
      <span
        aria-live="polite"
        className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-md bg-yellow-100 px-4 text-sm font-medium text-yellow-700 sm:w-auto dark:bg-yellow-900/30 dark:text-yellow-300 animate-in fade-in zoom-in-95 duration-200"
      >
        <Clock aria-hidden="true" className="size-4" />
        En validación
      </span>
    );
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
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>¿Marcar como pagada?</DrawerTitle>
            <DrawerDescription>
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
            </DrawerDescription>
          </DrawerHeader>
          <form
            action={handleSubmit}
            encType="multipart/form-data"
            className="contents"
          >
            <DrawerBody className="gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="receipt" className="text-sm">
                  Comprobante (opcional)
                </Label>
                <Input
                  id="receipt"
                  name="receipt"
                  type="file"
                  accept="image/*,application/pdf"
                  className="h-12 text-base file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-muted/80"
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sacale una foto o subí el comprobante de la transferencia.
                  Imagen o PDF, hasta 4MB.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="note" className="text-sm">
                  Notas o referencia (opcional)
                </Label>
                <Textarea
                  id="note"
                  name="note"
                  placeholder="Ej. transferí por Mercado Pago el 1/5"
                  rows={3}
                  maxLength={500}
                  disabled={isPending}
                />
              </div>
            </DrawerBody>
            <DrawerFooter>
              <Button
                type="submit"
                disabled={isPending}
                className="h-12 text-base touch-manipulation"
              >
                {isPending ? "Confirmando…" : "Sí, ya pagué"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="h-11 touch-manipulation"
              >
                Cancelar
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </>
  );
}
