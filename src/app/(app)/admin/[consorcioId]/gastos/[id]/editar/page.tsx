import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getConsorcioForAdmin } from "@/lib/queries/admin";
import { getExpenditureById } from "@/lib/queries/expenditures";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { ExpenditureForm } from "../../expenditure-form";

export const metadata: Metadata = {
  title: "Editar gasto — Mi edificio",
};

function isoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default async function EditExpenditurePage({
  params,
}: Readonly<{
  params: Promise<{ consorcioId: string; id: string }>;
}>) {
  const { consorcioId, id } = await params;
  const user = await requireUser();
  const [expenditure, consorcio] = await Promise.all([
    getExpenditureById(user, id),
    getConsorcioForAdmin(user, consorcioId),
  ]);

  if (!expenditure) notFound();
  if (!consorcio) notFound();
  if (expenditure.consorcioId !== consorcioId) notFound();

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <PageHeader
          backHref={`/admin/${consorcioId}/gastos`}
          backLabel="Volver al listado de gastos"
          icon={Pencil}
          tone="amber"
          title="Editar gasto"
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Datos del gasto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ExpenditureForm
              consorciosList={[consorcio]}
              consorcioId={consorcioId}
              defaultDate={isoDate(expenditure.date)}
              initialValues={{
                id: expenditure.id,
                consorcioId: expenditure.consorcioId,
                date: isoDate(expenditure.date),
                description: expenditure.description,
                amountPesos: Math.round(expenditure.amountCents / 100),
                category: expenditure.category,
                vendor: expenditure.vendor,
                notes: expenditure.notes,
                receiptUrl: expenditure.receiptUrl,
              }}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
