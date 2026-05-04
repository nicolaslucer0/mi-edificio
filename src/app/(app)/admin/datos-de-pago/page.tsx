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
import { PaymentInfoForm } from "./payment-info-form";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Datos de pago — Mi edificio",
};

export default async function PaymentInfoPage() {
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
            Datos de pago
          </h1>
        </div>

        {consorciosList.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No hay consorcios para administrar.
            </CardContent>
          </Card>
        ) : (
          consorciosList.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Cuenta para recibir transferencias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PaymentInfoForm
                  consorcioId={c.id}
                  consorcioName={c.name}
                  paymentHolderName={c.paymentHolderName}
                  paymentAlias={c.paymentAlias}
                  paymentCbu={c.paymentCbu}
                />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
