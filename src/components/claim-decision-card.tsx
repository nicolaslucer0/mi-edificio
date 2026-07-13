"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Paperclip } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  approveClaim,
  rejectClaim,
  type ActionResult,
} from "@/lib/actions/admin";
import { formatCurrencyCents, formatPeriod } from "@/lib/format";

type Props = {
  claimId: string;
  period: string;
  amountCents: number;
  claimAmountCents: number | null;
  paidCents: number;
  unitLabel: string;
  consorcioName: string;
  claimedByName: string | null;
  claimedByEmail: string | null;
  note: string | null;
  receiptUrl: string | null;
  claimedAt: Date;
};

export function ClaimDecisionCard({
  claimId,
  period,
  amountCents,
  claimAmountCents,
  paidCents,
  unitLabel,
  consorcioName,
  claimedByName,
  claimedByEmail,
  note,
  receiptUrl,
  claimedAt,
}: Readonly<Props>) {
  const router = useRouter();
  const [approvePending, startApprove] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  // Monto informado por el vecino (legacy sin monto = expensa completa).
  const informedCents = claimAmountCents ?? amountCents;
  const maxForThis = Math.max(0, amountCents - paidCents);
  const [confirmedPesos, setConfirmedPesos] = useState(
    String(Math.round(informedCents / 100)),
  );
  const [rejectState, rejectAction, rejectPending] = useActionState<
    ActionResult | null,
    FormData
  >(rejectClaim, null);

  function handleApprove() {
    const cents = Math.round(Number(confirmedPesos) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      toast.error("Ingresá un monto válido para confirmar.");
      return;
    }
    setHidden(true);
    startApprove(async () => {
      const result = await approveClaim(claimId, Math.min(cents, maxForThis));
      if (result.ok) {
        toast.success("Pago confirmado. El vecino recibió el aviso.");
        router.refresh();
      } else {
        setHidden(false);
        toast.error(result.error);
      }
    });
  }

  useEffect(() => {
    if (rejectState?.ok) {
      toast.success("Pago rechazado. El vecino recibió el aviso.");
      setRejectOpen(false);
      setHidden(true);
      router.refresh();
    }
  }, [rejectState, router]);

  if (hidden) return null;

  const claimerLabel = claimedByName ?? claimedByEmail ?? "Vecino";

  return (
    <Card className="animate-in fade-in slide-in-from-top-1 duration-200">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-1">
          <p className="text-base font-semibold text-balance">
            {claimerLabel}{" "}
            <span className="font-normal text-muted-foreground">
              · Unidad {unitLabel}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">{consorcioName}</p>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-xl font-semibold tabular-nums">
              {formatCurrencyCents(informedCents)}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatPeriod(period)}
            </p>
          </div>
          {(informedCents < amountCents || paidCents > 0) && (
            <p className="text-xs text-muted-foreground">
              Sobre un total de {formatCurrencyCents(amountCents)}
              {paidCents > 0 &&
                ` · ya validado ${formatCurrencyCents(paidCents)}`}
            </p>
          )}
        </div>
        {note && (
          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              Notas del vecino
            </p>
            <p className="text-sm leading-relaxed">{note}</p>
          </div>
        )}
        {receiptUrl && (
          <a
            href={`/api/receipts/claim/${claimId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded touch-manipulation"
          >
            <Paperclip aria-hidden="true" className="size-4" />
            Ver comprobante adjunto
          </a>
        )}
        <p className="text-xs text-muted-foreground">
          Avisó el {claimedAt.toLocaleString("es-AR")}
        </p>
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor={`confirm-${claimId}`}
            className="text-xs text-muted-foreground"
          >
            Monto a confirmar
          </Label>
          <div className="relative sm:w-44">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              $
            </span>
            <Input
              id={`confirm-${claimId}`}
              type="number"
              inputMode="numeric"
              min={1}
              max={Math.round(maxForThis / 100)}
              step={1}
              value={confirmedPesos}
              onChange={(e) => setConfirmedPesos(e.target.value)}
              disabled={approvePending}
              className="h-11 pl-7 text-base"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => setRejectOpen(true)}
            disabled={approvePending}
            className="h-11 sm:flex-1 touch-manipulation"
          >
            Rechazar
          </Button>
          <Button
            type="button"
            onClick={handleApprove}
            disabled={approvePending}
            className="h-11 sm:flex-1 touch-manipulation"
          >
            {approvePending ? "Confirmando…" : "Confirmar pago"}
          </Button>
        </div>
      </CardContent>

      <Drawer open={rejectOpen} onOpenChange={setRejectOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Rechazar pago</DrawerTitle>
            <DrawerDescription>
              Contale al vecino por qué rechazás el pago. Va a recibir un mail
              con el motivo y la posibilidad de volver a marcarla como pagada.
            </DrawerDescription>
          </DrawerHeader>
          <form action={rejectAction} className="contents">
            <input type="hidden" name="claimId" value={claimId} />
            <DrawerBody>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`reason-${claimId}`} className="text-sm">
                  Motivo del rechazo
                </Label>
                <Textarea
                  id={`reason-${claimId}`}
                  name="reason"
                  placeholder="Ej. No se ve la transferencia en el extracto."
                  rows={3}
                  required
                  minLength={3}
                  maxLength={500}
                  disabled={rejectPending}
                  aria-invalid={
                    rejectState && !rejectState.ok ? true : undefined
                  }
                />
                {rejectState && !rejectState.ok && (
                  <p
                    role="alert"
                    className="text-xs text-destructive leading-relaxed"
                  >
                    {rejectState.error}
                  </p>
                )}
              </div>
            </DrawerBody>
            <DrawerFooter>
              <Button
                type="submit"
                variant="destructive"
                disabled={rejectPending}
                className="h-12 text-base touch-manipulation"
              >
                {rejectPending ? "Enviando…" : "Rechazar pago"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setRejectOpen(false)}
                disabled={rejectPending}
                className="h-11 touch-manipulation"
              >
                Cancelar
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </Card>
  );
}
