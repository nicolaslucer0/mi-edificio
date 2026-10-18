import { Bell, Mail, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getCurrentConsorcioId } from "@/lib/consorcio-context";
import {
  getAccountStatement,
  type StatementMovement,
  type UnitStatement,
} from "@/lib/queries/statement";
import { getNotificationPrefs } from "@/lib/queries/users";
import { formatCurrencyCents, formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ExpenseStatusBadge } from "@/components/expense-status-badge";
import { PushToggle } from "@/components/push-toggle";
import { NotificationPrefsForm } from "@/components/notification-prefs-form";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Estado de cuenta — Mi edificio",
};

export default async function AccountStatementPage() {
  const user = await requireUser();
  const consorcioId = await getCurrentConsorcioId(user);
  const [statements, prefs] = await Promise.all([
    getAccountStatement(user, consorcioId),
    getNotificationPrefs(user.id),
  ]);

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

        <section className="flex flex-col gap-3 border-t border-border/60 pt-6">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-spot-violet-soft text-spot-violet"
            >
              <Bell className="size-5" />
            </span>
            <div className="flex flex-col">
              <h2 className="text-base font-semibold">
                Avisos en este dispositivo
              </h2>
              <p className="text-xs text-muted-foreground">
                Se configura por teléfono o computadora
              </p>
            </div>
          </div>
          <Card>
            <CardContent className="p-5">
              <PushToggle />
            </CardContent>
          </Card>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-spot-blue-soft text-spot-blue"
            >
              <Mail className="size-5" />
            </span>
            <div className="flex flex-col">
              <h2 className="text-base font-semibold">Qué avisos recibís</h2>
              <p className="text-xs text-muted-foreground">
                Vale para el mail y para los avisos del teléfono
              </p>
            </div>
          </div>
          <Card>
            <CardContent className="p-5">
              <NotificationPrefsForm
                prefs={prefs}
                isAdmin={user.isAdmin || user.isSuperAdmin}
              />
            </CardContent>
          </Card>
        </section>
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
              {unit.unitName}
            </p>
            <p className="text-sm text-muted-foreground">
              {settled ? "Sin saldo pendiente" : "Saldo pendiente"}
            </p>
            {unit.pendingCents > 0 && (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Avisaste{" "}
                <span className="font-semibold text-foreground">
                  {formatCurrencyCents(unit.pendingCents)}
                </span>{" "}
                que el administrador está revisando.
              </p>
            )}
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
            <ul aria-label={`Movimientos de ${unit.unitName}`}>
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
          {movement.status && (
            <ExpenseStatusBadge
              status={movement.status}
              period={movement.period}
            />
          )}
        </div>
      </div>
      <p
        className={cn(
          "shrink-0 text-sm font-bold tabular-nums",
          isPago && !movement.pending && "text-success",
          isPago && movement.pending && "text-muted-foreground",
          !isPago && "text-foreground",
        )}
      >
        {isPago ? "−" : "+"}
        {formatCurrencyCents(movement.amountCents)}
      </p>
    </li>
  );
}
