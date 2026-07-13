import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, FileSpreadsheet } from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getConsorcioForAdmin } from "@/lib/queries/admin";
import {
  getMonthlyExpenseReportRows,
  isValidPeriod,
  summarizeReport,
} from "@/lib/reports";
import { currentPeriod, formatCurrencyCents, formatPeriod } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExpenseStatusBadge } from "@/components/expense-status-badge";
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
  for (let i = 0; i < count; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  return periods;
}

export default async function ReportesPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ consorcioId: string }>;
  searchParams: Promise<{ period?: string }>;
}>) {
  const user = await requireUser();
  const { consorcioId } = await params;
  const sp = await searchParams;
  const consorcio = await getConsorcioForAdmin(user, consorcioId);
  if (!consorcio) notFound();

  const currentMonth = currentPeriod();
  const period =
    sp.period && isValidPeriod(sp.period) ? sp.period : currentMonth;
  const months = recentPeriods(6);

  const rows = await getMonthlyExpenseReportRows(consorcioId, period);
  const summary = summarizeReport(rows, []);
  const hasData = rows.length > 0;
  const downloadHref = `/api/reportes?consorcioId=${consorcioId}&period=${period}`;

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-3xl flex-col gap-6">
        <PageHeader
          backHref={`/admin/${consorcioId}`}
          backLabel="Volver al panel del consorcio"
          icon={FileSpreadsheet}
          tone="coral"
          title="Reportes"
          subtitle={consorcio.name}
        />

        <p className="text-sm leading-relaxed text-muted-foreground">
          Mirá quién pagó las expensas del mes y quién quedó con deuda, ordenado
          por piso y departamento. Después podés descargar el detalle completo en
          un archivo para Excel o Google Sheets.
        </p>

        {/* Selector de mes: recarga la página con ?period= */}
        <Card>
          <CardContent className="p-5">
            <form
              method="get"
              className="flex flex-col gap-4 sm:flex-row sm:items-end"
            >
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="period" className="text-base">
                  Elegí el mes
                </Label>
                <Input
                  id="period"
                  name="period"
                  type="month"
                  defaultValue={period}
                  max={currentMonth}
                  className="h-12 text-base"
                />
              </div>
              <button
                type="submit"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-12 px-5 text-base touch-manipulation",
                )}
              >
                Ver mes
              </button>
            </form>

            <div className="mt-4 flex flex-wrap gap-2">
              {months.map((m) => (
                <Link
                  key={m}
                  href={`/admin/${consorcioId}/reportes?period=${m}`}
                  aria-current={m === period ? "true" : undefined}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm touch-manipulation transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    m === period
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/60 bg-background text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  {formatPeriod(m)}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabla de estado de pago */}
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold">
              Estado de pago · {formatPeriod(period)}
            </h2>
            {hasData && (
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {summary.paidCount} de {summary.total}
                </span>{" "}
                pagaron · {summary.collectedPct}% cobrado
              </p>
            )}
          </div>

          {hasData ? (
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Piso</TableHead>
                    <TableHead>Depto</TableHead>
                    <TableHead>Propietario</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={`${r.unitLabel}-${r.type}`}>
                      <TableCell className="text-muted-foreground">
                        {r.floor ?? "—"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {r.unitLabel}
                      </TableCell>
                      <TableCell className="max-w-[12rem] truncate text-muted-foreground">
                        {r.owners || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.type === "extraordinaria"
                          ? "Extraordinaria"
                          : "Ordinaria"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrencyCents(r.amountCents)}
                      </TableCell>
                      <TableCell className="text-right">
                        <ExpenseStatusBadge
                          status={r.status}
                          period={r.period}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <Card>
              <CardContent className="px-6 py-10 text-center">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  No hay expensas cargadas para {formatPeriod(period)}. Elegí
                  otro mes o cargá las expensas del período.
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Descarga del reporte completo */}
        <div className="flex flex-col gap-3 border-t border-border/60 pt-6">
          <a
            href={downloadHref}
            className={cn(
              buttonVariants(),
              "h-12 px-5 text-base touch-manipulation",
            )}
          >
            <Download aria-hidden="true" className="size-4" />
            Descargar reporte de {formatPeriod(period)}
          </a>
          <p className="text-xs text-muted-foreground leading-relaxed">
            El archivo CSV incluye expensas, gastos y un resumen del mes, y se
            abre con Excel o Google Sheets. El día 1 de cada mes te llega por
            mail el reporte del mes anterior.
          </p>
        </div>
      </div>
    </main>
  );
}
