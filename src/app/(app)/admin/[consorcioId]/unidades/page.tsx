import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2 } from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { roleLabel } from "@/lib/roles";
import {
  getConsorcioWithUnitsForAdmin,
  type AdminConsorcioWithUnits,
} from "@/lib/queries/consorcio-admin";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { CreateUnitForm } from "./create-unit-form";
import { DeleteUnitButton } from "./delete-unit-button";

export const metadata: Metadata = {
  title: "Unidades — Mi edificio",
};

export default async function UnidadesPage({
  params,
}: Readonly<{
  params: Promise<{ consorcioId: string }>;
}>) {
  const user = await requireUser();
  const { consorcioId } = await params;
  const consorcio = await getConsorcioWithUnitsForAdmin(user, consorcioId);
  if (!consorcio) notFound();

  const groupedByFloor = groupUnitsByFloor(consorcio.units);

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <PageHeader
          backHref={`/admin/${consorcioId}`}
          backLabel="Volver al panel del consorcio"
          icon={Building2}
          tone="blue"
          title="Unidades"
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Agregar unidad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CreateUnitForm consorcioId={consorcio.id} />
          </CardContent>
        </Card>

        {consorcio.units.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Sin unidades cargadas todavía.
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {groupedByFloor.map(({ floor, units }) => (
              <Card key={floor}>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {floor === "" ? "Sin piso" : `Piso ${floor}`}
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
                                  href={`/admin/${consorcioId}/usuarios#user-${v.userId}`}
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
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
