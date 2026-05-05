import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getPendingClaimsForAdmin } from "@/lib/queries/admin";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClaimDecisionCard } from "@/components/claim-decision-card";
import { cn } from "@/lib/utils";

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
  const claims = await getPendingClaimsForAdmin(user, { consorcioId });

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/${consorcioId}`}
            aria-label="Volver al panel del consorcio"
            className={cn(
              buttonVariants({ variant: "outline", size: "icon-lg" }),
              "touch-manipulation",
            )}
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-2xl font-semibold tracking-tight text-balance">
              Aprobar pagos
            </h1>
            {claims.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {claims.length}{" "}
                {claims.length === 1
                  ? "pago esperando revisión"
                  : "pagos esperando revisión"}
              </p>
            )}
          </div>
        </div>

        {claims.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              <p className="text-base font-medium text-foreground">
                Estás al día 🎉
              </p>
              <p className="mt-1 text-sm leading-relaxed">
                No hay pagos esperando validación.
              </p>
            </CardContent>
          </Card>
        ) : (
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
                  unitLabel={claim.unitLabel}
                  consorcioName={claim.consorcioName}
                  claimedByName={claim.claimedByName}
                  claimedByEmail={claim.claimedByEmail}
                  note={claim.note}
                  claimedAt={claim.claimedAt}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
