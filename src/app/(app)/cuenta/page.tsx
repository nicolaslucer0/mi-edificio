import { Wallet } from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getCurrentConsorcioId } from "@/lib/consorcio-context";
import {
  getAccountStatement,
  type StatementMovement,
  type UnitStatement,
} from "@/lib/queries/statement";
import { formatCurrencyCents, formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ExpenseStatusBadge } from "@/components/expense-status-badge";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Estado de cuenta — Mi edificio",
};

export default async function AccountStatementPage() {
  const user = await requireUser();
  const consorcioId = await getCurrentConsorcioId(user);
  const statements = await getAccountStatement(user, consorcioId);

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <PageHeader
          backHref="/"
          backLabel="Volver al inicio"
          icon={Wallet}
          tone="green"
          title="Estado de cuenta"
        />

        {statements.length === 0 ? (
          <EmptyState
            icon={Wallet}
            tone="green"
            title="Todavía no tenés movimientos"
            description="Cuando el administrador cargue expensas para tu unidad, vas a ver acá tus cargos y pagos."
          />
        ) : (
          statements.map((unit) => (
            <UnitStatementCard key={unit.unitId} unit={unit} />
          ))
        )}
      </div>
    </main>
  );
}

function UnitStatementCard({ unit }: Readonly<{ unit: UnitStatement }>) {
  const settled = unit.balanceCents === 0;
  return (
    <section className="flex flex-col gap-3">
      <Card>
        <CardContent className="flex items-center justify-between gap-4 p-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Unidad {unit.unitLabel}
            </p>
            <p className="text-sm text-muted-foreground">
              {settled ? "Sin saldo pendiente" : "Saldo pendiente"}
            </p>
          </div>
          <p
            className={cn(
              "text-2xl font-bold tabular-nums",
              settled ? "text-success" : "text-destructive",
            )}
          >
            {formatCurrencyCents(unit.balanceCents)}
          </p>
        </CardContent>
      </Card>

      {unit.movements.length > 0 && (
        <Card>
          <CardContent className="px-5 py-1">
            <ul aria-label={`Movimientos de la unidad ${unit.unitLabel}`}>
              {unit.movements.map((m, idx) => (
                <MovementRow
                  key={m.id}
                  movement={m}
                  isLast={idx === unit.movements.length - 1}
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function MovementRow({
  movement,
  isLast,
}: Readonly<{ movement: StatementMovement; isLast: boolean }>) {
  const isPago = movement.kind === "pago";
  return (
    <li
      className={cn(
        "flex items-center gap-3 py-3.5",
        !isLast && "border-b border-border/50",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight">
          {movement.concept}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formatDate(movement.date)}
          </span>
          {movement.status && <ExpenseStatusBadge status={movement.status} />}
        </div>
      </div>
      <p
        className={cn(
          "shrink-0 text-sm font-bold tabular-nums",
          isPago ? "text-success" : "text-foreground",
        )}
      >
        {isPago ? "−" : "+"}
        {formatCurrencyCents(movement.amountCents)}
      </p>
    </li>
  );
}
