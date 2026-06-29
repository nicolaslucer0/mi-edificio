import { notFound } from "next/navigation";
import { Receipt } from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getConsorcioForAdmin } from "@/lib/queries/admin";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { ExpenditureForm } from "../expenditure-form";

export const metadata: Metadata = {
  title: "Cargar gasto — Mi edificio",
};

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default async function NewExpenditurePage({
  params,
}: Readonly<{
  params: Promise<{ consorcioId: string }>;
}>) {
  const user = await requireUser();
  const { consorcioId } = await params;
  const consorcio = await getConsorcioForAdmin(user, consorcioId);
  if (!consorcio) notFound();

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <PageHeader
          backHref={`/admin/${consorcioId}/gastos`}
          backLabel="Volver al listado"
          icon={Receipt}
          tone="amber"
          title="Cargar gasto del consorcio"
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
              defaultDate={todayIso()}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
