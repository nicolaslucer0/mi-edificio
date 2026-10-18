import Link from "next/link";
import { ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getCurrentConsorcioId } from "@/lib/consorcio-context";
import {
  getClaimInfoForExpenses,
  getCreditForUser,
  getDebtForUser,
  getOpenExpensesForUser,
  getPaidExpensesForUser,
  getPendingDepositsForUser,
} from "@/lib/queries/expenses";
import { getPaymentInfoForUser } from "@/lib/queries/consorcios";
import {
  formatCurrencyCents,
  formatDate,
  formatDueUrgency,
  formatPeriod,
  isFuturePeriod,
} from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClaimPaymentButton } from "@/components/claim-payment-button";
import { CreditPanel } from "@/components/credit-panel";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ExpenseStatusBadge } from "@/components/expense-status-badge";
import { PaymentInfoCard } from "@/components/payment-info-card";
import type { ExpenseClaimInfo, ExpenseRow } from "@/lib/queries/expenses";
import { CancelClaimButton } from "@/components/cancel-claim-button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Tus expensas — Mi edificio",
};

const PER_PAGE = 6;

export default async function ExpensesPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ page?: string }>;
}>) {
  const user = await requireUser();
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const consorcioId = await getCurrentConsorcioId(user);

  const [open, paid, paymentInfos, credits, pendingDeposits, debt] =
    await Promise.all([
      getOpenExpensesForUser(user, consorcioId),
      getPaidExpensesForUser(user, { page, perPage: PER_PAGE, consorcioId }),
      getPaymentInfoForUser(user, consorcioId),
      getCreditForUser(user, consorcioId),
      getPendingDepositsForUser(user, consorcioId),
      getDebtForUser(user, consorcioId),
    ]);

  const claimInfo = await getClaimInfoForExpenses(user, open);

  // Lo que debe va primero y entero: quien avisa varios meses juntos no
  // tiene que paginar para encontrarlos. Las pagadas, al final y paginadas.
  const inReview = open.filter((e) => e.status === "en_validacion");
  const toPay = open.filter(
    (e) => e.status !== "en_validacion" && !isFuturePeriod(e.period),
  );
  const upcoming = open.filter(
    (e) => e.status !== "en_validacion" && isFuturePeriod(e.period),
  );
  const hasAny = open.length > 0 || paid.total > 0;

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <PageHeader
          backHref="/"
          backLabel="Volver al inicio"
          icon={Wallet}
          tone="violet"
          title="Tus expensas"
        />

        {paymentInfos.map((info) => (
          <PaymentInfoCard key={info.consorcioId} consorcio={info} />
        ))}

        <CreditPanel
          units={credits}
          pendingDeposits={pendingDeposits}
          debtCents={debt.hasUnit ? debt.amountCents : 0}
        />

        {!hasAny ? (
          <EmptyState
            icon={Wallet}
            tone="green"
            title="Sin expensas todavía"
            description="Cuando el administrador cargue una expensa para tu unidad, va a aparecer acá."
          />
        ) : (
          <>
            {toPay.length > 0 ? (
              <ExpenseSection
                title="Para pagar"
                subtitle={
                  debt.hasUnit && debt.amountCents > 0
                    ? `En total debés ${formatCurrencyCents(debt.amountCents)}`
                    : undefined
                }
                items={toPay}
                claimInfo={claimInfo}
              />
            ) : (
              <p className="rounded-md bg-success/10 p-4 text-base font-medium text-success">
                No tenés expensas para pagar.
              </p>
            )}

            {inReview.length > 0 && (
              <ExpenseSection
                title="Esperando confirmación"
                subtitle="Avisaste que las pagaste y el administrador las está revisando."
                items={inReview}
                claimInfo={claimInfo}
              />
            )}

            {upcoming.length > 0 && (
              <ExpenseSection
                title="Próximas"
                subtitle="Todavía no vencen. Si querés, las podés adelantar."
                items={upcoming}
                claimInfo={claimInfo}
              />
            )}

            {paid.items.length > 0 && (
              <ExpenseSection title="Pagadas" items={paid.items}>
                {paid.totalPages > 1 && (
                  <Pagination page={paid.page} totalPages={paid.totalPages} />
                )}
              </ExpenseSection>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function ExpenseSection({
  title,
  subtitle,
  items,
  claimInfo,
  children,
}: Readonly<{
  title: string;
  subtitle?: string;
  items: ExpenseRow[];
  claimInfo?: Map<string, ExpenseClaimInfo>;
  children?: React.ReactNode;
}>) {
  return (
    <section className="flex flex-col gap-3" aria-label={title}>
      <div className="flex flex-col gap-0.5">
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
      <ul data-stagger className="flex flex-col gap-3">
        {items.map((expense, idx) => (
          <ExpenseListItem
            key={expense.id}
            expense={expense}
            index={idx}
            claims={claimInfo?.get(expense.id)}
          />
        ))}
      </ul>
      {children}
    </section>
  );
}

function ExpenseListItem({
  expense,
  index,
  claims,
}: Readonly<{
  expense: ExpenseRow;
  index: number;
  claims?: ExpenseClaimInfo;
}>) {
  const canClaim =
    expense.status === "pendiente" ||
    expense.status === "rechazado" ||
    expense.status === "parcial";
  const isPaid = expense.status === "pagado";
  const isInValidation = expense.status === "en_validacion";
  const isFuture = isFuturePeriod(expense.period);

  const isExtraordinaria = expense.type === "extraordinaria";
  const isPartiallyPaid =
    expense.paidCents > 0 && expense.paidCents < expense.amountCents;
  const remaining = Math.max(0, expense.amountCents - expense.paidCents);
  const paidPct = Math.min(
    100,
    Math.round((expense.paidCents / expense.amountCents) * 100),
  );
  // Una expensa a futuro todavía no vence: no mostramos urgencia.
  const urgency =
    canClaim && !isFuture ? formatDueUrgency(expense.dueDate) : null;

  return (
    <li style={{ "--stagger-index": index } as React.CSSProperties}>
      <Card
        className={cn(
          isExtraordinaria && "border-l-4 border-l-primary",
        )}
      >
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-start sm:gap-3">
              <p className="text-lg font-semibold text-balance">
                {formatPeriod(expense.period)}
                <span className="font-normal text-muted-foreground">
                  {" · "}
                  {isExtraordinaria ? "Extraordinaria" : "Ordinaria"}
                </span>
              </p>
              <ExpenseStatusBadge status={expense.status} period={expense.period} />
            </div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-2xl font-bold tabular-nums">
                {formatCurrencyCents(expense.amountCents)}
              </p>
              {urgency && (
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                    urgency.tone === "danger"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
                  )}
                >
                  {urgency.label}
                </span>
              )}
              <p className="text-sm text-muted-foreground">
                Vence el {formatDate(expense.dueDate)}
              </p>
            </div>

            {expense.description && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {expense.description}
              </p>
            )}

            {isPartiallyPaid && (
              <div className="flex flex-col gap-1.5">
                <p className="text-sm">
                  <span className="font-semibold text-success">
                    Pagaste {formatCurrencyCents(expense.paidCents)}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    · falta {formatCurrencyCents(remaining)}
                  </span>
                </p>
                <div
                  role="progressbar"
                  aria-valuenow={paidPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Pagado ${paidPct}%`}
                  className="h-2 w-full overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className="h-full rounded-full bg-success transition-[width]"
                    style={{ width: `${paidPct}%` }}
                  />
                </div>
              </div>
            )}

            {(isInValidation || expense.status === "rechazado") && claims && (
              <ClaimStatus
                claims={claims}
                showRejection={expense.status === "rechazado"}
              />
            )}
          </div>

          <div className="sm:shrink-0">
            {canClaim && (
              <ClaimPaymentButton
                expenseId={expense.id}
                period={expense.period}
                amountCents={expense.amountCents}
                paidCents={expense.paidCents}
                isFuture={isFuture}
              />
            )}
            {isPaid && (
              <Link
                href={`/expensas/${expense.id}/recibo`}
                aria-label={`Ver comprobante de ${formatPeriod(expense.period)}`}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-11 w-full px-5 text-sm touch-manipulation sm:w-auto",
                )}
              >
                Ver comprobante
              </Link>
            )}
            {isInValidation && !claims?.pending.length && (
              <p className="text-sm text-muted-foreground sm:text-right">
                El administrador
                <br className="hidden sm:inline" /> está revisando tu pago.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </li>
  );
}

/**
 * Lo que el vecino avisó y está en revisión, o por qué se lo rechazaron. Sin
 * el motivo a la vista, el vecino volvía a avisar lo mismo y lo volvían a
 * rechazar.
 */
function ClaimStatus({
  claims,
  showRejection,
}: Readonly<{ claims: ExpenseClaimInfo; showRejection: boolean }>) {
  if (claims.pending.length > 0) {
    return (
      <ul className="flex flex-col gap-2" aria-label="Pagos avisados">
        {claims.pending.map((p) => (
          <li
            key={p.id}
            className="flex flex-col gap-1 rounded-md bg-yellow-100 px-3 py-2 text-sm leading-relaxed text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 sm:flex-row sm:items-center sm:justify-between"
          >
            <span>
              Avisaste{" "}
              <span className="font-semibold">
                {formatCurrencyCents(p.amountCents)}
              </span>{" "}
              el {formatDate(p.claimedAt)}
              {p.hasReceipt ? ", con comprobante" : ", sin comprobante"}. El
              administrador lo está revisando.
            </span>
            {p.mine && <CancelClaimButton claimId={p.id} />}
          </li>
        ))}
      </ul>
    );
  }
  if (showRejection && claims.rejection) {
    return (
      <p
        role="note"
        className="rounded-md bg-destructive/10 px-3 py-2 text-sm leading-relaxed text-destructive"
      >
        El administrador no confirmó tu aviso de{" "}
        <span className="font-semibold">
          {formatCurrencyCents(claims.rejection.amountCents)}
        </span>
        {claims.rejection.reason ? `: «${claims.rejection.reason}»` : ""}. Si ya
        pagaste, volvé a avisar y adjuntá el comprobante.
      </p>
    );
  }
  return null;
}

function Pagination({
  page,
  totalPages,
}: Readonly<{ page: number; totalPages: number }>) {
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav aria-label="Paginación" className="flex items-center justify-between gap-3">
      {hasPrev ? (
        <Link
          href={`/expensas?page=${page - 1}`}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-11 px-4 text-sm touch-manipulation",
          )}
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          Anterior
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}

      <p className="text-sm text-muted-foreground tabular-nums">
        Página <span className="font-medium text-foreground">{page}</span> de{" "}
        <span className="font-medium text-foreground">{totalPages}</span>
      </p>

      {hasNext ? (
        <Link
          href={`/expensas?page=${page + 1}`}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-11 px-4 text-sm touch-manipulation",
          )}
        >
          Siguiente
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
    </nav>
  );
}
