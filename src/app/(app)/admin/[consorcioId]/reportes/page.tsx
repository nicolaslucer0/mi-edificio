import { notFound } from "next/navigation";
import { Download, FileSpreadsheet } from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getConsorcioForAdmin } from "@/lib/queries/admin";
import { previousPeriod } from "@/lib/reports";
import { formatPeriod } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Reportes — Mi edificio",
};

function recentPeriods(count: number): string[] {
  const now = new Date();
  const periods: string[] = [];
  for (let i = 1; i <= count; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  return periods;
}

export default async function ReportesPage({
  params,
}: Readonly<{ params: Promise<{ consorcioId: string }> }>) {
  const user = await requireUser();
  const { consorcioId } = await params;
  const consorcio = await getConsorcioForAdmin(user, consorcioId);
  if (!consorcio) notFound();

  const defaultPeriod = previousPeriod();
  const currentMonth = `${new Date().getFullYear()}-${String(
    new Date().getMonth() + 1,
  ).padStart(2, "0")}`;
  const months = recentPeriods(6);

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <PageHeader
          backHref={`/admin/${consorcioId}`}
          backLabel="Volver al panel del consorcio"
          icon={FileSpreadsheet}
          tone="coral"
          title="Reportes"
          subtitle={consorcio.name}
        />

        <p className="text-sm leading-relaxed text-muted-foreground">
          Descargá el detalle de cobranzas de un mes: quién pagó las expensas
          ordinarias y extraordinarias y quién quedó con deuda. El archivo CSV se
          abre con Excel o Google Sheets. El día 1 de cada mes te llega por mail
          el reporte del mes anterior.
        </p>

        <Card>
          <CardContent className="p-5">
            <form
              method="get"
              action="/api/reportes"
              className="flex flex-col gap-4 sm:flex-row sm:items-end"
            >
              <input type="hidden" name="consorcioId" value={consorcioId} />
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="period" className="text-base">
                  Elegí el mes
                </Label>
                <Input
                  id="period"
                  name="period"
                  type="month"
                  required
                  defaultValue={defaultPeriod}
                  max={currentMonth}
                  className="h-12 text-base"
                />
              </div>
              <button
                type="submit"
                className={cn(
                  buttonVariants(),
                  "h-12 px-5 text-base touch-manipulation",
                )}
              >
                <Download aria-hidden="true" className="size-4" />
                Descargar CSV
              </button>
            </form>
          </CardContent>
        </Card>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Últimos meses
          </h2>
          <ul className="flex flex-col gap-2">
            {months.map((period) => (
              <li key={period}>
                <a
                  href={`/api/reportes?consorcioId=${consorcioId}&period=${period}`}
                  className="group/r flex items-center gap-3 rounded-xl border border-border/50 bg-background p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"
                  >
                    <FileSpreadsheet className="size-5" />
                  </span>
                  <span className="flex-1 text-base font-semibold">
                    {formatPeriod(period)}
                  </span>
                  <Download
                    aria-hidden="true"
                    className="size-5 shrink-0 text-muted-foreground"
                  />
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
