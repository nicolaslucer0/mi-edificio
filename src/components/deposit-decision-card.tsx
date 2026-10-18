"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, PiggyBank } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { approveCreditDeposit, rejectCreditDeposit } from "@/lib/actions/admin";
import { formatCurrencyCents } from "@/lib/format";

type Props = {
  depositId: string;
  amountCents: number;
  /** Con edificio o piso (formatUnitWithFloor). */
  unitName: string;
  consorcioName: string;
  requestedByName: string | null;
  requestedByEmail: string | null;
  note: string | null;
  receiptUrl: string | null;
  createdAt: Date;
  /** Qué día transfirió, ya formateado en el servidor. */
  transferredLabel: string | null;
};

export function DepositDecisionCard({
  depositId,
  amountCents,
  unitName,
  consorcioName,
  requestedByName,
  requestedByEmail,
  note,
  receiptUrl,
  createdAt,
  transferredLabel,
}: Readonly<Props>) {
  const router = useRouter();
  const [approvePending, startApprove] = useTransition();
  const [rejectPending, startReject] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [hidden, setHidden] = useState(false);

  function handleApprove() {
    setHidden(true);
    startApprove(async () => {
      const result = await approveCreditDeposit(depositId);
      if (result.ok) {
        toast.success("Saldo a favor acreditado a la unidad.");
        router.refresh();
      } else {
        setHidden(false);
        toast.error(result.error);
      }
    });
  }

  function handleReject() {
    startReject(async () => {
      const result = await rejectCreditDeposit(depositId, reason);
      if (result.ok) {
        toast.success("Adelanto rechazado.");
        setRejectOpen(false);
        setHidden(true);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  if (hidden) return null;

  const requesterLabel = requestedByName ?? requestedByEmail ?? "Vecino";

  return (
    <Card className="animate-in fade-in slide-in-from-top-1 duration-200">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-1">
          <p className="text-base font-semibold text-balance">
            {requesterLabel}{" "}
            <span className="font-normal text-muted-foreground">
              · {unitName}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">{consorcioName}</p>
        </div>
        <div className="flex items-center gap-2">
          <PiggyBank aria-hidden="true" className="size-5 text-success" />
          <p className="text-xl font-semibold tabular-nums">
            {formatCurrencyCents(amountCents)}
          </p>
          <span className="text-sm text-muted-foreground">de adelanto</span>
        </div>
        {transferredLabel && (
          <p className="text-base font-semibold">
            Transfirió el {transferredLabel}
          </p>
        )}
        {note && (
          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              Notas del vecino
            </p>
            <p className="text-sm leading-relaxed">{note}</p>
          </div>
        )}
        {receiptUrl ? (
          <a
            href={`/api/receipts/deposit/${depositId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded touch-manipulation"
          >
            <Paperclip aria-hidden="true" className="size-4" />
            Ver comprobante adjunto
          </a>
        ) : (
          // Sin comprobante no hay con qué comparar: que se note antes de
          // confirmar, no después.
          <p className="rounded-md bg-amber-100 px-3 py-2 text-sm leading-relaxed text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
            Sin comprobante: buscalo en el extracto antes de confirmar.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Informado el {createdAt.toLocaleString("es-AR")}
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
            {approvePending ? "Acreditando…" : "Acreditar saldo"}
          </Button>
        </div>
      </CardContent>

      <ResponsiveDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Rechazar adelanto</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Contale al vecino por qué rechazás el adelanto.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogBody>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`deposit-reason-${depositId}`} className="text-sm">
                Motivo del rechazo
              </Label>
              <Textarea
                id={`deposit-reason-${depositId}`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej. No encuentro la transferencia en el extracto."
                rows={3}
                minLength={3}
                maxLength={500}
                disabled={rejectPending}
              />
            </div>
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter>
            <Button
              type="button"
              variant="destructive"
              onClick={handleReject}
              disabled={rejectPending || reason.trim().length < 3}
              className="h-12 text-base touch-manipulation"
            >
              {rejectPending ? "Enviando…" : "Rechazar adelanto"}
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
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </Card>
  );
}
