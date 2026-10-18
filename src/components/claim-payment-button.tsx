"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ReceiptInput } from "@/components/receipt-input";
import { claimPayment } from "@/lib/actions/expensas";
import { formatCurrencyCents, formatPeriod } from "@/lib/format";

type Props = {
  expenseId: string;
  period: string;
  amountCents: number;
  paidCents?: number;
  isFuture?: boolean;
  /** Abre el diálogo al entrar: el link del aviso "¿ya pagaste?". */
  defaultOpen?: boolean;
};

export function ClaimPaymentButton({
  expenseId,
  period,
  amountCents,
  paidCents = 0,
  isFuture = false,
  defaultOpen = false,
}: Readonly<Props>) {
  const [open, setOpen] = useState(defaultOpen);
  const [submitted, setSubmitted] = useState(false);
  const [mode, setMode] = useState<"full" | "partial">("full");
  const [partialPesos, setPartialPesos] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
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
  // Una transferencia que cubre varias expensas se avisa expensa por expensa;
  // antes el monto se recortaba en silencio y el resto se perdía.
  const overCents = enteredValid ? Math.max(0, enteredCents - remaining) : 0;

  function handleOpenChange(next: boolean) {
    if (isPending) return;
    setOpen(next);
    if (!next) {
      setMode("full");
      setPartialPesos("");
      setError(null);
      setSubmitError(null);
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
    // El diálogo queda abierto hasta que conteste el servidor: si algo falla
    // (la foto, la conexión), lo que escribió sigue ahí y el error se ve al
    // lado, en vez de cerrarse como si hubiera salido bien.
    startTransition(async () => {
      const result = await claimPayment(expenseId, formData);
      if (result.ok) {
        setSubmitted(true);
        setOpen(false);
        toast.success("Listo. El administrador va a validar tu pago.", {
          duration: 5000,
        });
        router.refresh();
      } else {
        setSubmitError(result.error);
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
      <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {isPartiallyPaid
                ? "Completar el pago"
                : isFuture
                  ? "¿Adelantar el pago?"
                  : "¿Registrar tu pago?"}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
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
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <form action={handleSubmit} className="contents">
            <ResponsiveDialogBody className="gap-4">
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
                    {overCents > 0 ? (
                      <p className="rounded-md bg-yellow-100 px-3 py-2 text-sm leading-relaxed text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">
                        Escribiste más de lo que falta en esta expensa (
                        {formatCurrencyCents(remaining)}). Si la transferencia
                        también pagaba otras expensas, avisá cada una con «Ya
                        pagué», y en las notas poné cuánto transferiste en
                        total.
                      </p>
                    ) : (
                      enteredValid && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Te va a quedar pendiente{" "}
                          <span className="font-semibold text-foreground">
                            {formatCurrencyCents(wouldRemain)}
                          </span>
                        </p>
                      )
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
                  Foto o captura del comprobante
                </Label>
                <ReceiptInput
                  id="receipt"
                  disabled={isPending}
                  hintId="receipt-hint"
                />
                <p
                  id="receipt-hint"
                  className="text-sm text-muted-foreground leading-relaxed"
                >
                  Con el comprobante, el administrador te lo confirma más
                  rápido. Si no lo tenés, podés avisar igual.
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
              {submitError && (
                <p
                  role="alert"
                  className="text-sm text-destructive leading-relaxed"
                >
                  {submitError}
                </p>
              )}
            </ResponsiveDialogBody>
            <ResponsiveDialogFooter>
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
            </ResponsiveDialogFooter>
          </form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}
