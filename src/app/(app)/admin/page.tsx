import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, ChevronRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getConsorciosForAdmin } from "@/lib/queries/admin";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Panel admin — Mi edificio",
};

const TYPE_LABELS = {
  edificio: "Edificio",
  ph: "PH",
  barrio_cerrado: "Barrio cerrado",
} as const;

export default async function AdminPickerPage() {
  const user = await requireUser();
  const consorciosList = await getConsorciosForAdmin(user);

  if (consorciosList.length === 1) {
    redirect(`/admin/${consorciosList[0].id}`);
  }

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <header className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Panel admin
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            Elegí un consorcio
          </h1>
          <p className="text-sm text-muted-foreground">
            Vas a entrar al panel de administración del consorcio que selecciones.
          </p>
        </header>

        {consorciosList.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Todavía no tenés consorcios asignados.
              </p>
              {user.isSuperAdmin && (
                <Link
                  href="/admin/consorcios"
                  className={cn(
                    buttonVariants(),
                    "h-11 px-4 text-sm touch-manipulation",
                  )}
                >
                  <Plus aria-hidden="true" className="size-4" />
                  Crear consorcio
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3" aria-label="Consorcios">
            {consorciosList.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/${c.id}`}
                  className="group/c block touch-manipulation rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Card className="transition-colors hover:bg-muted/40">
                    <CardContent className="flex items-center gap-3 p-5">
                      <div
                        aria-hidden="true"
                        className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"
                      >
                        <Building2 className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold leading-tight">
                          {c.name}
                        </p>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {TYPE_LABELS[c.type]}
                          {c.address ? ` · ${c.address}` : ""}
                        </p>
                      </div>
                      <ChevronRight
                        aria-hidden="true"
                        className="size-5 shrink-0 text-muted-foreground"
                      />
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {user.isSuperAdmin && consorciosList.length > 0 && (
          <div className="flex justify-center">
            <Link
              href="/admin/consorcios"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-11 px-4 text-sm touch-manipulation",
              )}
            >
              <Plus aria-hidden="true" className="size-4" />
              Crear nuevo consorcio
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
