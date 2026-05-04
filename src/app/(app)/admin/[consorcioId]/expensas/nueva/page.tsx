import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import {
  getConsorcioForAdmin,
  getUnitsForAdmin,
} from "@/lib/queries/admin";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ExpenseForm } from "./expense-form";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Nueva expensa — Mi edificio",
};

function defaultPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function defaultDueDate(): string {
  const now = new Date();
  const due = new Date(now.getFullYear(), now.getMonth() + 1, 10);
  return `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}`;
}

export default async function NewExpensePage({
  params,
}: Readonly<{
  params: Promise<{ consorcioId: string }>;
}>) {
  const user = await requireUser();
  const { consorcioId } = await params;
  const [consorcio, allUnits] = await Promise.all([
    getConsorcioForAdmin(user, consorcioId),
    getUnitsForAdmin(user),
  ]);
  if (!consorcio) notFound();
  const units = allUnits.filter((u) => u.consorcioId === consorcioId);

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
            Nueva expensa
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Datos de la expensa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ExpenseForm
              consorcioId={consorcioId}
              consorcioName={consorcio.name}
              units={units}
              defaultPeriod={defaultPeriod()}
              defaultDueDate={defaultDueDate()}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
