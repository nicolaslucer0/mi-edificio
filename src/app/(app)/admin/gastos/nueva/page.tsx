import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getConsorciosForAdmin } from "@/lib/queries/admin";
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

export default async function NewExpenditurePage() {
  const user = await requireUser();
  const consorciosList = await getConsorciosForAdmin(user);

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
              consorciosList={consorciosList}
              defaultDate={todayIso()}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
