import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getConsorcioForAdmin } from "@/lib/queries/admin";
import {
  getDebtBoardConfig,
  getDebtBoardPreview,
} from "@/lib/queries/debt-board";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { DebtBoardSummary, DebtBoardUnits } from "@/components/debt-board";
import { DebtBoardForm } from "./debt-board-form";

export const metadata: Metadata = {
  title: "Estado de pagos — Mi edificio",
};

export default async function EstadoDePagosAdminPage({
  params,
}: Readonly<{
  params: Promise<{ consorcioId: string }>;
}>) {
  const user = await requireUser();
  const { consorcioId } = await params;

  const [consorcio, config] = await Promise.all([
    getConsorcioForAdmin(user, consorcioId),
    getDebtBoardConfig(consorcioId),
  ]);
  if (!consorcio || !config) notFound();

  const preview = await getDebtBoardPreview(user, consorcioId, config.graceDays);

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <PageHeader
          backHref={`/admin/${consorcioId}`}
          backLabel="Volver al panel del consorcio"
          icon={Users}
          tone="teal"
          title="Estado de pagos"
          subtitle={consorcio.name}
        />

        <p className="text-sm leading-relaxed text-muted-foreground">
          Elegí cuánto ven los vecinos sobre quién está al día con las expensas.
          Se identifica la unidad, nunca a la persona, y quien ya avisó que pagó
          no figura hasta que vos rechaces el pago.
        </p>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Configuración
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DebtBoardForm
              consorcioId={consorcio.id}
              visibility={config.visibility}
              graceDays={config.graceDays}
              onHome={config.onHome}
            />
          </CardContent>
        </Card>

        <section className="flex flex-col gap-3 border-t border-border/60 pt-6">
          <h2 className="text-base font-semibold">Qué expone cada opción</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Con los datos reales de {consorcio.name} y {config.graceDays} días
            de gracia. Guardá los cambios para actualizar esta vista.
          </p>

          {preview && preview.totalUnits > 0 ? (
            <>
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Con “Solo el resumen” ven esto
                </h3>
                <DebtBoardSummary board={preview} />
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Con “Listado por unidad”, además de lo de arriba
                </h3>
                {preview.units.length > 0 ? (
                  <DebtBoardUnits units={preview.units} />
                ) : (
                  <Card>
                    <CardContent className="px-6 py-8 text-center">
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Hoy no hay ninguna unidad con deuda vencida, así que el
                        listado saldría vacío.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="px-6 py-10 text-center">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Todavía no hay expensas emitidas en este consorcio, así que no
                  hay nada que mostrar.
                </p>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </main>
  );
}
