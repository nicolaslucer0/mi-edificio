import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import { requireUser, roleLabel } from "@/lib/session";
import {
  getConsorciosWithUnitsForAdmin,
  type AdminConsorcioWithUnits,
} from "@/lib/queries/consorcio-admin";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CreateConsorcioForm } from "./create-consorcio-form";
import { CreateUnitForm } from "./create-unit-form";
import { DeleteUnitButton } from "./delete-unit-button";

export const metadata: Metadata = {
  title: "Consorcios y unidades — Mi edificio",
};

const TYPE_LABELS = {
  edificio: "Edificio",
  ph: "PH",
  barrio_cerrado: "Barrio cerrado",
} as const;

export default async function ConsorciosAdminPage() {
  const user = await requireUser();
  const consorciosList = await getConsorciosWithUnitsForAdmin(user);

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
            Consorcios y unidades
          </h1>
        </div>

        {user.isSuperAdmin && (
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
        )}

        <section
          aria-labelledby="consorcios-heading"
          className="flex flex-col gap-3"
        >
          <h2
            id="consorcios-heading"
            className="text-lg font-semibold tracking-tight"
          >
            Tus consorcios
            {consorciosList.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({consorciosList.length})
              </span>
            )}
          </h2>
          {consorciosList.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {user.isSuperAdmin
                  ? "Todavía no hay consorcios cargados."
                  : "No tenés consorcios asignados."}
              </CardContent>
            </Card>
          ) : (
            <ul className="flex flex-col gap-4" aria-label="Lista de consorcios">
              {consorciosList.map((c) => (
                <li key={c.id}>
                  <ConsorcioCard consorcio={c} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function ConsorcioCard({
  consorcio,
}: Readonly<{ consorcio: AdminConsorcioWithUnits }>) {
  const groupedByFloor = groupUnitsByFloor(consorcio.units);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          {consorcio.name}
        </CardTitle>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {TYPE_LABELS[consorcio.type]}
          {consorcio.address ? ` · ${consorcio.address}` : ""}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {consorcio.units.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Sin unidades cargadas.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {groupedByFloor.map(({ floor, units }) => (
              <div key={floor} className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {floor === "" ? "Sin piso" : `Piso ${floor}`}
                </p>
                <ul className="flex flex-col gap-2">
                  {units.map((u) => (
                    <li
                      key={u.id}
                      id={`unit-${u.id}`}
                      className="scroll-mt-24 rounded-lg bg-muted/50 px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          Unidad {u.label}
                        </span>
                        <DeleteUnitButton unitId={u.id} label={u.label} />
                      </div>
                      {u.vecinos.length > 0 && (
                        <ul className="mt-1.5 flex flex-col gap-0.5">
                          {u.vecinos.map((v) => (
                            <li
                              key={v.membershipId}
                              className="text-xs leading-relaxed"
                            >
                              <Link
                                href={`/admin/usuarios#user-${v.userId}`}
                                className="text-muted-foreground hover:text-foreground hover:underline underline-offset-2"
                              >
                                {v.userName ?? v.userEmail} (
                                {roleLabel(v.role)})
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        <CreateUnitForm consorcioId={consorcio.id} />
      </CardContent>
    </Card>
  );
}

function groupUnitsByFloor(
  list: AdminConsorcioWithUnits["units"],
): Array<{ floor: string; units: AdminConsorcioWithUnits["units"] }> {
  const map = new Map<string, AdminConsorcioWithUnits["units"]>();
  for (const u of list) {
    const key = u.floor ?? "";
    const arr = map.get(key) ?? [];
    arr.push(u);
    map.set(key, arr);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => {
      if (a === "") return 1;
      if (b === "") return -1;
      return a.localeCompare(b, "es", { numeric: true });
    })
    .map(([floor, units]) => ({ floor, units }));
}
