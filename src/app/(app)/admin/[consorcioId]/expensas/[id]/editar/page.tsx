import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getExpenseForAdmin } from "@/lib/queries/expenses-admin";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ExpenseEditForm, toDateInputValue } from "./expense-edit-form";

export const metadata: Metadata = {
  title: "Editar expensa — Mi edificio",
};

export default async function EditExpensePage({
  params,
}: Readonly<{
  params: Promise<{ consorcioId: string; id: string }>;
}>) {
  const user = await requireUser();
  const { consorcioId, id } = await params;
  const expense = await getExpenseForAdmin(user, id);
  if (!expense) notFound();
  if (expense.consorcioId !== consorcioId) notFound();

  const unitDisplay = expense.unitFloor
    ? `Piso ${expense.unitFloor} — Unidad ${expense.unitLabel}`
    : `Unidad ${expense.unitLabel}`;

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/${consorcioId}/expensas`}
            aria-label="Volver al listado"
            className={cn(
              buttonVariants({ variant: "outline", size: "icon-lg" }),
              "touch-manipulation",
            )}
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            Editar expensa
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Datos de la expensa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ExpenseEditForm
              id={expense.id}
              consorcioId={consorcioId}
              unitDisplay={unitDisplay}
              consorcioName={expense.consorcioName}
              defaultPeriod={expense.period}
              defaultDueDate={toDateInputValue(expense.dueDate)}
              defaultAmountPesos={Math.round(expense.amountCents / 100)}
              defaultType={expense.type}
              defaultDescription={expense.description ?? ""}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
