import { notFound } from "next/navigation";
import { Wallet } from "lucide-react";
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
import { OpeningBalanceForm } from "./opening-balance-form";
import { PaymentInfoForm } from "./payment-info-form";

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
        <PageHeader
          backHref={`/admin/${consorcioId}`}
          backLabel="Volver al panel del consorcio"
          icon={Wallet}
          tone="green"
          title="Datos de pago y saldo"
        />

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
