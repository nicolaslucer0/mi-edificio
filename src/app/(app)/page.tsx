import Link from "next/link";
import { BarChart3, Check, Receipt, ShieldCheck } from "lucide-react";
import { signOut } from "@/lib/auth";
import { requireUser, roleLabel } from "@/lib/session";
import { getDebtForUser } from "@/lib/queries/expenses";
import { formatCurrencyCents } from "@/lib/format";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

async function handleSignOut() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export default async function Home() {
  const user = await requireUser();
  const debt = await getDebtForUser(user);
  const displayName = user.name ?? user.email;

  return (
    <main className="flex flex-1 flex-col items-center gap-8 px-6 py-10">
      <header className="flex w-full max-w-md flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          Mi edificio
        </h1>
        <p className="text-lg leading-relaxed">
          Hola, <span className="font-medium">{displayName}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          {roleLabel(user.primaryRole)}
        </p>
      </header>

      {debt.hasUnit && (
        <section
          aria-label="Estado de tus expensas"
          className="w-full max-w-md"
        >
          {debt.amountCents === 0 ? <UpToDateCard /> : <DebtCard debt={debt} />}
        </section>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
        <Link
          href="/gastos"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-12 px-5 text-base touch-manipulation",
          )}
        >
          <Receipt aria-hidden="true" className="size-4" />
          Ver gastos del consorcio
        </Link>
        <Link
          href="/balance"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-12 px-5 text-base touch-manipulation",
          )}
        >
          <BarChart3 aria-hidden="true" className="size-4" />
          Balance del consorcio
        </Link>
      </div>

      {(user.isSuperAdmin || user.isAdmin) && (
        <Link
          href="/admin"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-12 px-5 text-base touch-manipulation",
          )}
        >
          <ShieldCheck aria-hidden="true" className="size-4" />
          Ir al panel admin
        </Link>
      )}

      <form action={handleSignOut} className="mt-auto">
        <Button
          type="submit"
          variant="outline"
          className="h-11 px-5 text-sm touch-manipulation"
        >
          Cerrar sesión
        </Button>
      </form>
    </main>
  );
}

function UpToDateCard() {
  return (
    <Card className="border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/30">
      <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
        <div
          aria-hidden="true"
          className="flex size-16 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300"
        >
          <Check className="size-8" />
        </div>
        <p className="text-2xl font-semibold text-green-700 dark:text-green-300 text-balance">
          Estás al día 🎉
        </p>
        <p className="text-sm text-green-700/80 dark:text-green-300/80 leading-relaxed">
          No tenés expensas pendientes.
        </p>
      </CardContent>
    </Card>
  );
}

function DebtCard({
  debt,
}: Readonly<{
  debt: { amountCents: number; count: number };
}>) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
        <p className="text-base text-muted-foreground">Tenés que pagar</p>
        <p className="text-4xl font-bold text-destructive tabular-nums text-balance sm:text-5xl">
          {formatCurrencyCents(debt.amountCents)}
        </p>
        <p className="text-sm text-muted-foreground">
          {debt.count === 1
            ? "1 expensa pendiente"
            : `${debt.count} expensas pendientes`}
        </p>
        <Link
          href="/expensas"
          className={cn(
            buttonVariants(),
            "h-12 px-6 text-base touch-manipulation mt-2",
          )}
        >
          Ver detalle
        </Link>
      </CardContent>
    </Card>
  );
}
