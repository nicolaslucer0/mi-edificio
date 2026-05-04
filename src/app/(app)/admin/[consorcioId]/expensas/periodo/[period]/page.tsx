import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil, Plus } from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import {
  getExpensesForAdmin,
  type AdminExpenseRow,
} from "@/lib/queries/expenses-admin";
import { formatCurrencyCents, formatDate, formatPeriod } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExpenseStatusBadge } from "@/components/expense-status-badge";
import { cn } from "@/lib/utils";
import { DeleteExpenseButton } from "../../delete-expense-button";

export const metadata: Metadata = {
  title: "Período — Mi edificio",
};

const PER_PAGE = 200;
const PERIOD_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

type UnitGroup = {
  unitId: string;
  unitLabel: string;
  unitFloor: string | null;
  consorcioId: string;
  consorcioName: string;
  expenses: AdminExpenseRow[];
};

export default async function PeriodDetailPage({
  params,
}: Readonly<{
  params: Promise<{ consorcioId: string; period: string }>;
}>) {
  const user = await requireUser();
  const { consorcioId, period } = await params;
  if (!PERIOD_REGEX.test(period)) notFound();

  const paginated = await getExpensesForAdmin(user, {
    page: 1,
    perPage: PER_PAGE,
    period,
    consorcioId,
  });

  if (paginated.items.length === 0) notFound();

  const periodLabel = formatPeriod(period);
  const totalAmount = paginated.items.reduce(
    (sum, e) => sum + e.amountCents,
    0,
  );

  const groups = groupByUnit(paginated.items);

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href={`/admin/${consorcioId}/expensas`}
              aria-label="Volver al listado de períodos"
              className={cn(
                buttonVariants({ variant: "outline", size: "icon-lg" }),
                "touch-manipulation",
              )}
            >
              <ChevronLeft aria-hidden="true" className="size-5" />
            </Link>
            <div className="flex flex-col">
              <h1 className="text-2xl font-semibold tracking-tight text-balance">
                {periodLabel}
              </h1>
              <p className="text-xs text-muted-foreground">
                {paginated.items.length}{" "}
                {paginated.items.length === 1 ? "expensa" : "expensas"} ·{" "}
                {formatCurrencyCents(totalAmount)}
              </p>
            </div>
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

        <ul className="flex flex-col gap-3" aria-label="Unidades del período">
          {groups.map((g) => (
            <li key={g.unitId}>
              <UnitGroupCard group={g} consorcioId={consorcioId} />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

function groupByUnit(items: AdminExpenseRow[]): UnitGroup[] {
  const map = new Map<string, UnitGroup>();
  for (const e of items) {
    let group = map.get(e.unitId);
    if (!group) {
      group = {
        unitId: e.unitId,
        unitLabel: e.unitLabel,
        unitFloor: e.unitFloor,
        consorcioId: e.consorcioId,
        consorcioName: e.consorcioName,
        expenses: [],
      };
      map.set(e.unitId, group);
    }
    group.expenses.push(e);
  }
  for (const g of map.values()) {
    g.expenses.sort((a, b) => {
      if (a.type === b.type) return 0;
      return a.type === "ordinaria" ? -1 : 1;
    });
  }
  return Array.from(map.values()).sort(byFloorLabel);
}

function byFloorLabel(a: UnitGroup, b: UnitGroup): number {
  const floorA = a.unitFloor ?? "";
  const floorB = b.unitFloor ?? "";
  const floor = floorA.localeCompare(floorB, "es", { numeric: true });
  if (floor !== 0) return floor;
  return a.unitLabel.localeCompare(b.unitLabel, "es", { numeric: true });
}

function UnitGroupCard({
  group,
  consorcioId,
}: Readonly<{ group: UnitGroup; consorcioId: string }>) {
  const unitDisplay = group.unitFloor
    ? `Piso ${group.unitFloor} — Unidad ${group.unitLabel}`
    : `Unidad ${group.unitLabel}`;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold leading-tight">{unitDisplay}</p>
        </div>

        <ul
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
          aria-label="Expensas de la unidad"
        >
          {group.expenses.map((expense) => (
            <li key={expense.id} className="flex">
              <ExpenseRow
                expense={expense}
                unitDisplay={unitDisplay}
                consorcioId={consorcioId}
              />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function ExpenseRow({
  expense,
  unitDisplay,
  consorcioId,
}: Readonly<{
  expense: AdminExpenseRow;
  unitDisplay: string;
  consorcioId: string;
}>) {
  const isExtraordinaria = expense.type === "extraordinaria";
  const deleteLabel = `${formatPeriod(expense.period)} · ${unitDisplay} · ${
    isExtraordinaria ? "Extraordinaria" : "Ordinaria"
  }`;

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-2 rounded-lg border border-border/60 bg-muted/30 p-3",
        isExtraordinaria && "border-l-4 border-l-primary",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {isExtraordinaria ? "Extraordinaria" : "Ordinaria"}
        </p>
        <ExpenseStatusBadge status={expense.status} />
      </div>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-lg font-bold tabular-nums">
          {formatCurrencyCents(expense.amountCents)}
        </p>
        <p className="text-xs text-muted-foreground">
          Vence el {formatDate(expense.dueDate)}
        </p>
      </div>

      {expense.description && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {expense.description}
        </p>
      )}

      <div className="flex items-center gap-1 self-end">
        <Link
          href={`/admin/${consorcioId}/expensas/${expense.id}/editar`}
          aria-label={`Editar expensa ${deleteLabel}`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "text-muted-foreground hover:text-foreground touch-manipulation",
          )}
        >
          <Pencil aria-hidden="true" className="size-4" />
        </Link>
        <DeleteExpenseButton expenseId={expense.id} label={deleteLabel} />
      </div>
    </div>
  );
}
