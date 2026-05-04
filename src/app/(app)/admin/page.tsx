import Link from "next/link";
import { Building2, ChevronLeft, Plus, Receipt, Users, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getPendingClaimsForAdmin } from "@/lib/queries/admin";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClaimDecisionCard } from "@/components/claim-decision-card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Panel admin — Mi edificio",
};

export default async function AdminDashboard() {
  const user = await requireUser();
  const pendingClaims = await getPendingClaimsForAdmin(user);

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="Volver al inicio"
            className={cn(
              buttonVariants({ variant: "outline", size: "icon-lg" }),
              "touch-manipulation",
            )}
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            Panel admin
          </h1>
        </div>

        <section aria-labelledby="claims-heading" className="flex flex-col gap-3">
          <h2
            id="claims-heading"
            className="text-lg font-semibold tracking-tight"
          >
            Pagos por validar
            {pendingClaims.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({pendingClaims.length})
              </span>
            )}
          </h2>
          {pendingClaims.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No hay pagos esperando validación 🎉
              </CardContent>
            </Card>
          ) : (
            <ul
              className="flex flex-col gap-3"
              aria-label="Lista de pagos por validar"
            >
              {pendingClaims.map((claim) => (
                <li key={claim.claimId}>
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
        </section>

        <section aria-labelledby="actions-heading" className="flex flex-col gap-3">
          <h2
            id="actions-heading"
            className="text-lg font-semibold tracking-tight"
          >
            Acciones
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <ActionCard
              href="/admin/expensas"
              title="Gestionar expensas"
              description="Cargar, editar o borrar expensas. Soporta crear para todo un consorcio."
              icon={<Plus className="size-5" />}
            />
            <ActionCard
              href="/admin/gastos"
              title="Gestionar gastos"
              description="Cargar, editar o borrar gastos del consorcio."
              icon={<Receipt className="size-5" />}
            />
            <ActionCard
              href="/admin/datos-de-pago"
              title="Datos de pago"
              description="Editar alias, CBU y titular del consorcio."
              icon={<Wallet className="size-5" />}
            />
            <ActionCard
              href="/admin/usuarios"
              title="Vecinos"
              description="Agregar vecinos y gestionar sus unidades."
              icon={<Users className="size-5" />}
            />
            <ActionCard
              href="/admin/consorcios"
              title="Consorcios y unidades"
              description="Crear consorcios y cargar unidades por piso."
              icon={<Building2 className="size-5" />}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function ActionCard({
  href,
  title,
  description,
  icon,
}: Readonly<{
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}>) {
  return (
    <Link
      href={href}
      className="block touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
    >
      <Card className="h-full transition-colors hover:bg-muted/50">
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <div
            aria-hidden="true"
            className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary"
          >
            {icon}
          </div>
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              {description}
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}
