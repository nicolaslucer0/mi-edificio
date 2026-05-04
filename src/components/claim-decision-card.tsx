"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
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
  unitLabel: string;
  consorcioName: string;
  claimedByName: string | null;
  claimedByEmail: string | null;
  note: string | null;
  claimedAt: Date;
};

export function ClaimDecisionCard({
  claimId,
  period,
  amountCents,
  unitLabel,
  consorcioName,
  claimedByName,
  claimedByEmail,
  note,
  claimedAt,
}: Readonly<Props>) {
  const router = useRouter();
  const [approvePending, startApprove] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectState, rejectAction, rejectPending] = useActionState<
    ActionResult | null,
    FormData
  >(rejectClaim, null);

  function handleApprove() {
    startApprove(async () => {
      const result = await approveClaim(claimId);
      if (result.ok) {
        toast.success("Pago confirmado. El vecino recibió el aviso.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  useEffect(() => {
    if (rejectState?.ok) {
      toast.success("Pago rechazado. El vecino recibió el aviso.");
      setRejectOpen(false);
      router.refresh();
    }
  }, [rejectState, router]);

  const claimerLabel = claimedByName ?? claimedByEmail ?? "Vecino";

  return (
    <Card>
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
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-xl font-semibold tabular-nums">
            {formatCurrencyCents(amountCents)}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatPeriod(period)}
          </p>
        </div>
        {note && (
          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              Notas del vecino
            </p>
            <p className="text-sm leading-relaxed">{note}</p>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Avisó el {claimedAt.toLocaleString("es-AR")}
        </p>
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

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="gap-3">
            <DialogTitle className="text-lg">Rechazar pago</DialogTitle>
            <DialogDescription className="leading-relaxed">
              Contale al vecino por qué rechazás el pago. Va a recibir un mail
              con el motivo y la posibilidad de volver a marcarla como pagada.
            </DialogDescription>
          </DialogHeader>
          <form action={rejectAction} className="flex flex-col gap-4">
            <input type="hidden" name="claimId" value={claimId} />
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
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRejectOpen(false)}
                disabled={rejectPending}
                className="h-11"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={rejectPending}
                className="h-11"
              >
                {rejectPending ? "Enviando…" : "Rechazar pago"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
