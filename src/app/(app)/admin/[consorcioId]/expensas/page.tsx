import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import {
  getExpensePeriodsForAdmin,
  type ExpensePeriodSummary,
} from "@/lib/queries/expenses-admin";
import { formatCurrencyCents, formatPeriod } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Expensas — Mi edificio",
};

const PER_PAGE = 12;

export default async function AdminExpensasPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ consorcioId: string }>;
  searchParams: Promise<{ page?: string }>;
}>) {
  const user = await requireUser();
  const { consorcioId } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const paginated = await getExpensePeriodsForAdmin(user, {
    page,
    perPage: PER_PAGE,
    consorcioId,
  });

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between gap-3">
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
            <h1 className="text-2xl font-semibold tracking-tight text-balance">
              Expensas
            </h1>
          </div>
          <Link
            href={`/admin/${consorcioId}/expensas/nueva`}
            className={cn(
              buttonVariants(),
              "h-11 px-4 text-sm touch-manipulation",
            )}
          >
            <Plus aria-hidden="true" className="size-4" />
            Nueva
          </Link>
        </div>

        {paginated.items.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Todavía no hay expensas cargadas.
            </CardContent>
          </Card>
        ) : (
          <>
            <ul
              data-stagger
              className="flex flex-col gap-3"
              aria-label="Lista de períodos"
            >
              {paginated.items.map((period, idx) => (
                <li
                  key={period.period}
                  style={{ "--stagger-index": idx } as React.CSSProperties}
                >
                  <PeriodCard summary={period} consorcioId={consorcioId} />
                </li>
              ))}
            </ul>

            {paginated.totalPages > 1 && (
              <Pagination
                consorcioId={consorcioId}
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

function PeriodCard({
  summary,
  consorcioId,
}: Readonly<{ summary: ExpensePeriodSummary; consorcioId: string }>) {
  const periodLabel = formatPeriod(summary.period);
  const totalLabel = `${summary.total} ${summary.total === 1 ? "expensa" : "expensas"}`;

  return (
    <Link
      href={`/admin/${consorcioId}/expensas/periodo/${summary.period}`}
      aria-label={`Ver ${periodLabel}`}
      className="block touch-manipulation rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="transition-colors hover:bg-muted/40">
        <CardContent className="flex items-center justify-between gap-4 p-5">
          <div className="flex flex-col gap-1.5">
            <p className="text-base font-semibold leading-tight">
              {periodLabel}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {totalLabel} · {formatCurrencyCents(summary.totalAmountCents)}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              {summary.paidCount > 0 && (
                <StatusDot
                  count={summary.paidCount}
                  label="pagadas"
                  className="bg-success"
                  textClass="text-success"
                />
              )}
              {summary.inValidationCount > 0 && (
                <StatusDot
                  count={summary.inValidationCount}
                  label="en validación"
                  className="bg-yellow-500"
                  textClass="text-yellow-700 dark:text-yellow-400"
                />
              )}
              {summary.pendingCount > 0 && (
                <StatusDot
                  count={summary.pendingCount}
                  label="pendientes"
                  className="bg-destructive"
                  textClass="text-destructive"
                />
              )}
            </div>
          </div>
          <ChevronRight
            aria-hidden="true"
            className="size-5 shrink-0 text-muted-foreground"
          />
        </CardContent>
      </Card>
    </Link>
  );
}

function StatusDot({
  count,
  label,
  className,
  textClass,
}: Readonly<{
  count: number;
  label: string;
  className: string;
  textClass: string;
}>) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={cn("inline-block size-1.5 rounded-full", className)}
      />
      <span className={cn("font-medium", textClass)}>
        {count} {label}
      </span>
    </span>
  );
}

function Pagination({
  consorcioId,
  page,
  totalPages,
}: Readonly<{ consorcioId: string; page: number; totalPages: number }>) {
  const hasPrev = page > 1;
  const hasNext = page < totalPages;
  const base = `/admin/${consorcioId}/expensas`;

  return (
    <nav
      aria-label="Paginación"
      className="flex items-center justify-between gap-3"
    >
      {hasPrev ? (
        <Link
          href={`${base}?page=${page - 1}`}
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
          href={`${base}?page=${page + 1}`}
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
