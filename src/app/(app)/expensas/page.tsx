import Link from "next/link";
import { ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getCurrentConsorcioId } from "@/lib/consorcio-context";
import { getExpensesForUser } from "@/lib/queries/expenses";
import { getPaymentInfoForUser } from "@/lib/queries/consorcios";
import { formatCurrencyCents, formatDate, formatPeriod } from "@/lib/format";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClaimPaymentButton } from "@/components/claim-payment-button";
import { EmptyState } from "@/components/empty-state";
import { ExpenseStatusBadge } from "@/components/expense-status-badge";
import { PaymentInfoCard } from "@/components/payment-info-card";
import type { ExpenseRow } from "@/lib/queries/expenses";
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

  const [paginated, paymentInfos] = await Promise.all([
    getExpensesForUser(user, { page, perPage: PER_PAGE, consorcioId }),
    getPaymentInfoForUser(user, consorcioId),
  ]);

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
            Tus expensas
          </h1>
        </div>

        {paymentInfos.map((info) => (
          <PaymentInfoCard key={info.consorcioId} consorcio={info} />
        ))}

        {paginated.items.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Sin expensas todavía"
            description="Cuando el administrador cargue una expensa para tu unidad, va a aparecer acá."
          />
        ) : (
          <>
            <ul
              data-stagger
              className="flex flex-col gap-3"
              aria-label="Lista de expensas"
            >
              {paginated.items.map((expense, idx) => (
                <ExpenseListItem
                  key={expense.id}
                  expense={expense}
                  index={idx}
                />
              ))}
            </ul>

            {paginated.totalPages > 1 && (
              <Pagination
                page={paginated.page}
                totalPages={paginated.totalPages}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}

function ExpenseListItem({
  expense,
  index,
}: Readonly<{ expense: ExpenseRow; index: number }>) {
  const isPending =
    expense.status === "pendiente" || expense.status === "rechazado";
  const isPaid = expense.status === "pagado";
  const isInValidation = expense.status === "en_validacion";

  const isExtraordinaria = expense.type === "extraordinaria";

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
              </p>
              <ExpenseStatusBadge status={expense.status} />
            </div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-2xl font-bold tabular-nums">
                {formatCurrencyCents(expense.amountCents)}
              </p>
              <p className="text-sm text-muted-foreground">
                Vence el {formatDate(expense.dueDate)}
                {expense.type === "extraordinaria" && (
                  <>
                    {" · "}
                    <span className="font-medium text-foreground">
                      Extraordinaria
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="sm:shrink-0">
            {isPending && (
              <ClaimPaymentButton
                expenseId={expense.id}
                period={expense.period}
                amountCents={expense.amountCents}
              />
            )}
            {isPaid && (
              <Button
                variant="outline"
                disabled
                aria-disabled
                aria-label={`Ver comprobante de ${formatPeriod(expense.period)}`}
                className="h-11 w-full px-5 text-sm sm:w-auto"
              >
                Ver comprobante
              </Button>
            )}
            {isInValidation && (
              <p className="text-xs text-muted-foreground sm:text-right">
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
