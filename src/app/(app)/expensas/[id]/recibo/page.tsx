import { notFound } from "next/navigation";
import { Building2, Check, Paperclip, Receipt } from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getReceiptData } from "@/lib/queries/expenses";
import { formatCurrencyCents, formatDate, formatPeriod } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { PaidStamp } from "@/components/illustrations";
import { cn } from "@/lib/utils";
import { PrintButton } from "./print-button";

export const metadata: Metadata = {
  title: "Comprobante de pago — Mi edificio",
};

export default async function ReceiptPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const user = await requireUser();
  const { id } = await params;
  const receipt = await getReceiptData(user, id);
  if (!receipt) notFound();

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="print:hidden">
          <PageHeader
            backHref="/expensas"
            backLabel="Volver a tus expensas"
            icon={Receipt}
            tone="green"
            title="Comprobante"
          />
        </div>

        <Card className="overflow-hidden">
          <CardContent className="flex flex-col gap-6 p-6 sm:p-8">
            <div className="flex flex-col items-center gap-3 text-center">
              <PaidStamp className="size-24" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Comprobante de pago
                </p>
                <p className="mt-1 text-3xl font-bold tabular-nums">
                  {formatCurrencyCents(receipt.amountCents)}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-sm font-semibold text-success">
                <Check aria-hidden="true" className="size-4" />
                Pagada
              </span>
            </div>

            <dl className="flex flex-col divide-y divide-border/60 border-y border-border/60">
              <ReceiptRow label="Consorcio" value={receipt.consorcioName} />
              <ReceiptRow label="Unidad" value={receipt.unitLabel} />
              <ReceiptRow
                label="Período"
                value={formatPeriod(receipt.period)}
              />
              <ReceiptRow
                label="Tipo"
                value={
                  receipt.type === "extraordinaria"
                    ? "Extraordinaria"
                    : "Ordinaria"
                }
              />
              {receipt.paidAt && (
                <ReceiptRow
                  label="Validado el"
                  value={formatDate(receipt.paidAt)}
                />
              )}
              {receipt.holderName && (
                <ReceiptRow label="Titular" value={receipt.holderName} />
              )}
            </dl>

            {receipt.description && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {receipt.description}
              </p>
            )}

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Building2 aria-hidden="true" className="size-3.5" />
              <span>Generado por Mi edificio</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 print:hidden">
          <PrintButton />
          {receipt.receiptUrl && (
            <a
              href={receipt.receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-11 text-sm touch-manipulation",
              )}
            >
              <Paperclip aria-hidden="true" className="size-4" />
              Ver comprobante que enviaste
            </a>
          )}
        </div>
      </div>
    </main>
  );
}

function ReceiptRow({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold text-right">{value}</dd>
    </div>
  );
}
