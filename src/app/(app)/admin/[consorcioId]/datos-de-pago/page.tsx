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
import { OpeningBalanceForm } from "./opening-balance-form";
import { PaymentInfoForm } from "./payment-info-form";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Datos de pago — Mi edificio",
};

export default async function PaymentInfoPage({
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
            Datos de pago y saldo
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Cuenta para recibir transferencias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentInfoForm
              consorcioId={consorcio.id}
              consorcioName={consorcio.name}
              paymentHolderName={consorcio.paymentHolderName}
              paymentAlias={consorcio.paymentAlias}
              paymentCbu={consorcio.paymentCbu}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Saldo inicial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <OpeningBalanceForm
              consorcioId={consorcio.id}
              consorcioName={consorcio.name}
              openingBalanceCents={consorcio.openingBalanceCents}
              openingBalanceDate={consorcio.openingBalanceDate}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
