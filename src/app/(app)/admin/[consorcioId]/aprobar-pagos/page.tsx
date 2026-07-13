import { ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import {
  getPendingClaimsForAdmin,
  getPendingCreditDepositsForAdmin,
} from "@/lib/queries/admin";
import { Card, CardContent } from "@/components/ui/card";
import { ClaimDecisionCard } from "@/components/claim-decision-card";
import { DepositDecisionCard } from "@/components/deposit-decision-card";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Aprobar pagos — Mi edificio",
};

export default async function AprobarPagosPage({
  params,
}: Readonly<{
  params: Promise<{ consorcioId: string }>;
}>) {
  const user = await requireUser();
  const { consorcioId } = await params;
  const [claims, deposits] = await Promise.all([
    getPendingClaimsForAdmin(user, { consorcioId }),
    getPendingCreditDepositsForAdmin(user, { consorcioId }),
  ]);

  const totalPending = claims.length + deposits.length;
  const headerSubtitle =
    totalPending > 0
      ? `${totalPending} ${totalPending === 1 ? "pendiente por revisar" : "pendientes por revisar"}`
      : undefined;

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <PageHeader
          backHref={`/admin/${consorcioId}`}
          backLabel="Volver al panel del consorcio"
          icon={ShieldAlert}
          tone="amber"
          title="Aprobar pagos"
          subtitle={headerSubtitle}
        />

        {totalPending === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              <p className="text-base font-medium text-foreground">
                Estás al día 🎉
              </p>
              <p className="mt-1 text-sm leading-relaxed">
                No hay pagos ni adelantos esperando validación.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {deposits.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Adelantos por validar
                </h2>
                <ul
                  data-stagger
                  className="flex flex-col gap-3"
                  aria-label="Adelantos por validar"
                >
                  {deposits.map((deposit, idx) => (
                    <li
                      key={deposit.depositId}
                      style={{ "--stagger-index": idx } as React.CSSProperties}
                    >
                      <DepositDecisionCard
                        depositId={deposit.depositId}
                        amountCents={deposit.amountCents}
                        unitLabel={deposit.unitLabel}
                        consorcioName={deposit.consorcioName}
                        requestedByName={deposit.requestedByName}
                        requestedByEmail={deposit.requestedByEmail}
                        note={deposit.note}
                        receiptUrl={deposit.receiptUrl}
                        createdAt={deposit.createdAt}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {claims.length > 0 && (
              <section className="flex flex-col gap-3">
                {deposits.length > 0 && (
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Pagos por validar
                  </h2>
                )}
                <ul
                  data-stagger
                  className="flex flex-col gap-3"
                  aria-label="Lista de pagos por validar"
                >
                  {claims.map((claim, idx) => (
                    <li
                      key={claim.claimId}
                      style={{ "--stagger-index": idx } as React.CSSProperties}
                    >
                      <ClaimDecisionCard
                        claimId={claim.claimId}
                        period={claim.period}
                        amountCents={claim.amountCents}
                        claimAmountCents={claim.claimAmountCents}
                        paidCents={claim.paidCents}
                        unitLabel={claim.unitLabel}
                        consorcioName={claim.consorcioName}
                        claimedByName={claim.claimedByName}
                        claimedByEmail={claim.claimedByEmail}
                        note={claim.note}
                        receiptUrl={claim.receiptUrl}
                        claimedAt={claim.claimedAt}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
