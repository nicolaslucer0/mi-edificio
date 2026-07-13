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
  paidCents?: number;
  isFuture?: boolean;
};

export function ClaimPaymentButton({
  expenseId,
  period,
  amountCents,
  paidCents = 0,
  isFuture = false,
}: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [mode, setMode] = useState<"full" | "partial">("full");
  const [partialPesos, setPartialPesos] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const remaining = Math.max(0, amountCents - paidCents);
  const isPartiallyPaid = paidCents > 0;
  const remainingPesos = Math.round(remaining / 100);

  const enteredCents = Math.round(Number(partialPesos) * 100);
  const enteredValid =
    partialPesos !== "" && Number.isFinite(enteredCents) && enteredCents > 0;
  const wouldRemain = enteredValid
    ? Math.max(0, remaining - Math.min(enteredCents, remaining))
    : remaining;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setMode("full");
      setPartialPesos("");
      setError(null);
    }
  }

  function handleSubmit(formData: FormData) {
    let amount = remaining;
    if (mode === "partial") {
      if (!enteredValid) {
        setError("Ingresá cuánto transferiste.");
        return;
      }
      amount = Math.min(enteredCents, remaining);
    }
    formData.set("amountCents", String(amount));
    setError(null);
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

  const triggerLabel = (() => {
    if (isPartiallyPaid) return "Pagar lo que falta";
    return isFuture ? "Adelantar expensa" : "Ya pagué";
  })();

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
        variant={isFuture && !isPartiallyPaid ? "outline" : "default"}
        aria-label={`${triggerLabel} — expensa de ${formatPeriod(period)}`}
        className="h-11 w-full px-5 text-sm touch-manipulation sm:w-auto"
      >
        {triggerLabel}
      </Button>
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {isPartiallyPaid
                ? "Completar el pago"
                : isFuture
                  ? "¿Adelantar el pago?"
                  : "¿Registrar tu pago?"}
            </DrawerTitle>
            <DrawerDescription>
              <span className="font-semibold text-foreground">
                {formatPeriod(period)}
              </span>{" "}
              ·{" "}
              <span className="font-semibold text-foreground">
                {formatCurrencyCents(amountCents)}
              </span>
              {isPartiallyPaid && (
                <>
                  <br />
                  Ya pagaste {formatCurrencyCents(paidCents)} · falta{" "}
                  <span className="font-semibold text-foreground">
                    {formatCurrencyCents(remaining)}
                  </span>
                </>
              )}
            </DrawerDescription>
          </DrawerHeader>
          <form action={handleSubmit} className="contents">
            <DrawerBody className="gap-4">
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-sm font-medium">
                  ¿Cuánto transferiste?
                </legend>
                <label className="flex items-center gap-3 rounded-lg border border-border/60 p-3 touch-manipulation has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === "full"}
                    onChange={() => {
                      setMode("full");
                      setError(null);
                    }}
                    className="size-4 accent-primary"
                  />
                  <span className="text-sm">
                    Pagué todo —{" "}
                    <span className="font-semibold">
                      {formatCurrencyCents(remaining)}
                    </span>
                  </span>
                </label>
                <label className="flex items-center gap-3 rounded-lg border border-border/60 p-3 touch-manipulation has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === "partial"}
                    onChange={() => setMode("partial")}
                    className="size-4 accent-primary"
                  />
                  <span className="text-sm">Pagué una parte</span>
                </label>

                {mode === "partial" && (
                  <div className="flex flex-col gap-2 pl-1 pt-1">
                    <Label htmlFor="partial-amount" className="text-sm">
                      Monto que transferí
                    </Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground">
                        $
                      </span>
                      <Input
                        id="partial-amount"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={remainingPesos}
                        step={1}
                        value={partialPesos}
                        onChange={(e) => {
                          setPartialPesos(e.target.value);
                          setError(null);
                        }}
                        placeholder={String(remainingPesos)}
                        className="h-12 pl-7 text-base"
                        disabled={isPending}
                      />
                    </div>
                    {enteredValid && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Te va a quedar pendiente{" "}
                        <span className="font-semibold text-foreground">
                          {formatCurrencyCents(wouldRemain)}
                        </span>
                      </p>
                    )}
                    {error && (
                      <p
                        role="alert"
                        className="text-xs text-destructive leading-relaxed"
                      >
                        {error}
                      </p>
                    )}
                  </div>
                )}
              </fieldset>

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
                {isPending ? "Confirmando…" : "Confirmar"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
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
