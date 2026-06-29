import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Receipt } from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import {
  getExpendituresForUser,
  isValidCategory,
  isValidMonth,
} from "@/lib/queries/expenditures";
import {
  formatCurrencyCents,
  formatPeriod,
  type ExpenditureCategory,
} from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { ExpenditureFilters } from "@/components/expenditure-filters";
import { ExpenditureItem } from "@/components/expenditure-item";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Gestionar gastos — Mi edificio",
};

const PER_PAGE = 10;

export default async function AdminExpendituresPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ consorcioId: string }>;
  searchParams: Promise<{
    page?: string;
    category?: string;
    month?: string;
  }>;
}>) {
  const user = await requireUser();
  const { consorcioId } = await params;
  const sp = await searchParams;
  const category =
    sp.category && isValidCategory(sp.category) ? sp.category : undefined;
  const month = sp.month && isValidMonth(sp.month) ? sp.month : undefined;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const paginated = await getExpendituresForUser(user, {
    page,
    perPage: PER_PAGE,
    filters: { category, month, consorcioId },
  });

  const isFiltered = Boolean(category || month);
  const periodLabel = month ? formatPeriod(month) : "todos los meses";
  const basePath = `/admin/${consorcioId}/gastos`;

  const emptyStateNode =
    paginated.items.length === 0
      ? renderEmptyState(isFiltered, basePath)
      : null;

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
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            Gestionar gastos
          </h1>
        </div>

        <Link
          href={`${basePath}/nueva`}
          className={cn(
            buttonVariants(),
            "h-12 px-5 text-base touch-manipulation",
          )}
        >
          <Plus aria-hidden="true" className="size-4" />
          Cargar gasto nuevo
        </Link>

        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <ExpenditureFilters
              category={category}
              month={month}
              basePath={basePath}
            />
            <div className="flex flex-col gap-1 border-t pt-4 text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Total {periodLabel}
              </p>
              <p className="text-3xl font-bold tabular-nums">
                {formatCurrencyCents(paginated.totalCents)}
              </p>
              <p className="text-xs text-muted-foreground">
                {paginated.total === 1
                  ? "1 gasto"
                  : `${paginated.total} gastos`}
              </p>
            </div>
          </CardContent>
        </Card>

        {emptyStateNode ?? (
          <>
            <ul
              className="flex flex-col gap-3"
              aria-label="Lista de gastos del consorcio"
            >
              {paginated.items.map((item) => (
                <li key={item.id}>
                  <ExpenditureItem
                    item={item}
                    showAdminActions
                    editHrefBase={basePath}
                  />
                </li>
              ))}
            </ul>

            {paginated.totalPages > 1 && (
              <Pagination
                consorcioId={consorcioId}
                page={paginated.page}
                totalPages={paginated.totalPages}
                category={category}
                month={month}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}

function renderEmptyState(isFiltered: boolean, basePath: string) {
  if (isFiltered) {
    return (
      <EmptyState
        icon={Receipt}
        tone="amber"
        title="Sin coincidencias"
        description="Probá cambiando la categoría o el mes."
      />
    );
  }
  return (
    <EmptyState
      icon={Receipt}
      tone="amber"
      title="Sin gastos todavía"
      description="Cargá el primer gasto del consorcio para empezar a llevar el balance."
      action={{
        href: `${basePath}/nueva`,
        label: "Cargar gasto",
      }}
    />
  );
}

function Pagination({
  consorcioId,
  page,
  totalPages,
  category,
  month,
}: Readonly<{
  consorcioId: string;
  page: number;
  totalPages: number;
  category: ExpenditureCategory | undefined;
  month: string | undefined;
}>) {
  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (month) params.set("month", month);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    const base = `/admin/${consorcioId}/gastos`;
    return qs ? `${base}?${qs}` : base;
  };
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav
      aria-label="Paginación"
      className="flex items-center justify-between gap-3"
    >
      {hasPrev ? (
        <Link
          href={buildHref(page - 1)}
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
          href={buildHref(page + 1)}
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
