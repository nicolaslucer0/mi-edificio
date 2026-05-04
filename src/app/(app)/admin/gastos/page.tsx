import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
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
import { ExpenditureFilters } from "@/components/expenditure-filters";
import { ExpenditureItem } from "@/components/expenditure-item";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Gestionar gastos — Mi edificio",
};

const PER_PAGE = 10;

export default async function AdminExpendituresPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{
    page?: string;
    category?: string;
    month?: string;
  }>;
}>) {
  const user = await requireUser();
  const params = await searchParams;
  const category =
    params.category && isValidCategory(params.category)
      ? params.category
      : undefined;
  const month =
    params.month && isValidMonth(params.month) ? params.month : undefined;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const paginated = await getExpendituresForUser(user, {
    page,
    perPage: PER_PAGE,
    filters: { category, month },
  });

  const isFiltered = Boolean(category || month);
  const periodLabel = month ? formatPeriod(month) : "todos los meses";

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            aria-label="Volver al panel admin"
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
          href="/admin/gastos/nueva"
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
            <ExpenditureFilters category={category} month={month} />
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

        {paginated.items.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              {isFiltered
                ? "No hay gastos con esos filtros."
                : "Todavía no hay gastos cargados."}
            </CardContent>
          </Card>
        ) : (
          <>
            <ul
              className="flex flex-col gap-3"
              aria-label="Lista de gastos del consorcio"
            >
              {paginated.items.map((item) => (
                <li key={item.id}>
                  <ExpenditureItem item={item} showAdminActions />
                </li>
              ))}
            </ul>

            {paginated.totalPages > 1 && (
              <Pagination
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

function Pagination({
  page,
  totalPages,
  category,
  month,
}: Readonly<{
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
    return qs ? `/admin/gastos?${qs}` : "/admin/gastos";
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
