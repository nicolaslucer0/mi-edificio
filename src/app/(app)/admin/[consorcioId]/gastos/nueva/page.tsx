import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getConsorcioForAdmin } from "@/lib/queries/admin";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ExpenditureForm } from "../expenditure-form";
import { cn } from "@/lib/utils";

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
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/${consorcioId}/gastos`}
            aria-label="Volver al listado"
            className={cn(
              buttonVariants({ variant: "outline", size: "icon-lg" }),
              "touch-manipulation",
            )}
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            Cargar gasto del consorcio
          </h1>
        </div>

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
