import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, ChevronLeft, ChevronRight } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { CreateConsorcioForm } from "./create-consorcio-form";

export const metadata: Metadata = {
  title: "Consorcios — Mi edificio",
};

const TYPE_LABELS = {
  edificio: "Edificio",
  ph: "PH",
  barrio_cerrado: "Barrio cerrado",
} as const;

export default async function ConsorciosAdminPage() {
  const user = await requireUser();
  if (!user.isSuperAdmin) {
    redirect("/admin");
  }
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
            Consorcios
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Crear consorcio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CreateConsorcioForm />
          </CardContent>
        </Card>

        <section
          aria-labelledby="consorcios-heading"
          className="flex flex-col gap-3"
        >
          <h2
            id="consorcios-heading"
            className="text-lg font-semibold tracking-tight"
          >
            Todos los consorcios
            {consorciosList.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({consorciosList.length})
              </span>
            )}
          </h2>
          {consorciosList.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Todavía no hay consorcios cargados.
              </CardContent>
            </Card>
          ) : (
            <ul
              className="flex flex-col gap-3"
              aria-label="Lista de consorcios"
            >
              {consorciosList.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/admin/${c.id}`}
                    className="block touch-manipulation rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        </section>
      </div>
    </main>
  );
}
