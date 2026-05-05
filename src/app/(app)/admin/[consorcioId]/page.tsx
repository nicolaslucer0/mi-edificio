import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2,
  ChevronRight,
  Coins,
  FileWarning,
  Plus,
  Receipt,
  ShieldAlert,
  Users,
  Wallet,
} from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import {
  getConsorcioDashboardStats,
  getConsorcioForAdmin,
} from "@/lib/queries/admin";
import { formatCurrencyCents, formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TYPE_LABELS = {
  edificio: "Edificio",
  ph: "PH",
  barrio_cerrado: "Barrio cerrado",
} as const;

export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{ consorcioId: string }>;
}>): Promise<Metadata> {
  const user = await requireUser();
  const { consorcioId } = await params;
  const consorcio = await getConsorcioForAdmin(user, consorcioId);
  return {
    title: consorcio
      ? `${consorcio.name} — Mi edificio`
      : "Consorcio — Mi edificio",
  };
}

export default async function ConsorcioDashboard({
  params,
}: Readonly<{
  params: Promise<{ consorcioId: string }>;
}>) {
  const user = await requireUser();
  const { consorcioId } = await params;
  const [consorcio, stats] = await Promise.all([
    getConsorcioForAdmin(user, consorcioId),
    getConsorcioDashboardStats(user, consorcioId),
  ]);
  if (!consorcio || !stats) notFound();

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <header className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Panel admin
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            {consorcio.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {TYPE_LABELS[consorcio.type]}
            {consorcio.address ? ` · ${consorcio.address}` : ""}
            {" · "}
            {stats.unitCount}{" "}
            {stats.unitCount === 1 ? "unidad" : "unidades"} ·{" "}
            {stats.vecinoCount}{" "}
            {stats.vecinoCount === 1 ? "vecino" : "vecinos"}
          </p>
        </header>

        <section
          aria-labelledby="stats-heading"
          className="flex flex-col gap-3"
        >
          <h2 id="stats-heading" className="sr-only">
            Resumen
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <BalanceStat
              balance={stats.totalBalanceCents}
              openingDate={stats.openingBalanceDate}
            />
            <StatCard
              label="Pendiente este mes"
              value={formatCurrencyCents(stats.pendingThisMonthCents)}
              hint={
                stats.pendingThisMonthCount === 0
                  ? "Todo cobrado"
                  : `${stats.pendingThisMonthCount} ${
                      stats.pendingThisMonthCount === 1
                        ? "expensa"
                        : "expensas"
                    }`
              }
              icon={<FileWarning aria-hidden="true" className="size-4" />}
              tone={
                stats.pendingThisMonthCount > 0 ? "warning" : "neutral"
              }
            />
            <StatCard
              label="Pagos por validar"
              value={String(stats.claimsPendingCount)}
              hint={
                stats.claimsPendingCount === 0
                  ? "Sin pendientes"
                  : "Tocá para revisar"
              }
              icon={<ShieldAlert aria-hidden="true" className="size-4" />}
              tone={stats.claimsPendingCount > 0 ? "warning" : "neutral"}
              href={
                stats.claimsPendingCount > 0
                  ? `/admin/${consorcioId}/aprobar-pagos`
                  : undefined
              }
            />
          </div>
        </section>

        <section
          aria-labelledby="actions-heading"
          className="flex flex-col gap-3"
        >
          <h2
            id="actions-heading"
            className="text-lg font-semibold tracking-tight"
          >
            Acciones
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {stats.claimsPendingCount > 0 && (
              <ActionCard
                href={`/admin/${consorcioId}/aprobar-pagos`}
                title="Aprobar pagos"
                description={`${stats.claimsPendingCount} ${
                  stats.claimsPendingCount === 1
                    ? "pago esperando"
                    : "pagos esperando"
                } tu validación.`}
                icon={<ShieldAlert className="size-5" />}
                emphasis
              />
            )}
            <ActionCard
              href={`/admin/${consorcioId}/expensas`}
              title="Gestionar expensas"
              description="Crear, editar o borrar. Soporta crear para todo el consorcio."
              icon={<Plus className="size-5" />}
            />
            <ActionCard
              href={`/admin/${consorcioId}/gastos`}
              title="Gestionar gastos"
              description="Cargar gastos del consorcio con comprobante."
              icon={<Receipt className="size-5" />}
            />
            <ActionCard
              href={`/admin/${consorcioId}/usuarios`}
              title="Vecinos"
              description="Agregar vecinos y asignarlos a unidades."
              icon={<Users className="size-5" />}
            />
            <ActionCard
              href={`/admin/${consorcioId}/unidades`}
              title="Unidades"
              description="Agregar o quitar unidades por piso."
              icon={<Building2 className="size-5" />}
            />
            <ActionCard
              href={`/admin/${consorcioId}/datos-de-pago`}
              title="Datos de pago y saldo"
              description="Alias, CBU, titular y saldo inicial."
              icon={<Wallet className="size-5" />}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function BalanceStat({
  balance,
  openingDate,
}: Readonly<{ balance: number; openingDate: Date | null }>) {
  const positive = balance >= 0;
  return (
    <Card
      className={cn(
        "border-l-4",
        positive ? "border-l-success" : "border-l-destructive",
      )}
    >
      <CardContent className="flex flex-col gap-1 p-4">
        <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Coins aria-hidden="true" className="size-4" />
          Saldo del consorcio
        </p>
        <p
          className={cn(
            "text-xl font-bold tabular-nums",
            positive
              ? "text-success"
              : "text-destructive",
          )}
        >
          {formatCurrencyCents(balance)}
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {openingDate
            ? `Desde ${formatDate(openingDate)}`
            : "Sin saldo inicial cargado"}
        </p>
      </CardContent>
    </Card>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon,
  tone,
  href,
}: Readonly<{
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  tone: "neutral" | "warning";
  href?: string;
}>) {
  const body = (
    <Card
      className={cn(
        href && "transition-colors hover:bg-muted/40",
      )}
    >
      <CardContent className="flex flex-col gap-1 p-4">
        <p
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide",
            tone === "warning"
              ? "text-yellow-700 dark:text-yellow-400"
              : "text-muted-foreground",
          )}
        >
          {icon}
          {label}
        </p>
        <p className="text-xl font-bold tabular-nums">{value}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
  if (!href) return body;
  return (
    <Link
      href={href}
      className="block touch-manipulation rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {body}
    </Link>
  );
}

function ActionCard({
  href,
  title,
  description,
  icon,
  emphasis = false,
}: Readonly<{
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  emphasis?: boolean;
}>) {
  return (
    <Link
      href={href}
      className="group/action block touch-manipulation rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card
        className={cn(
          "h-full transition-colors",
          emphasis
            ? "border-l-4 border-l-primary bg-primary/5 hover:bg-primary/10"
            : "hover:bg-muted/40",
        )}
      >
        <CardContent className="flex items-center gap-3 p-4">
          <div
            aria-hidden="true"
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-2xl",
              emphasis
                ? "bg-primary text-primary-foreground"
                : "bg-primary/10 text-primary",
            )}
          >
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight">{title}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
          <ChevronRight
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground"
          />
        </CardContent>
      </Card>
    </Link>
  );
}
