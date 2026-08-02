import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getConsorcioForAdmin, getUnitsForAdmin } from "@/lib/queries/admin";
import { getUsersForAdmin } from "@/lib/queries/users";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import {
  VecinosBoard,
  type Assignment,
  type FloorGroup,
  type UnitGroup,
} from "./vecinos-board";
import { NewVecinoButton } from "./new-vecino-button";

export const metadata: Metadata = {
  title: "Vecinos — Mi edificio",
};

export default async function UsuariosPage({
  params,
}: Readonly<{
  params: Promise<{ consorcioId: string }>;
}>) {
  const user = await requireUser();
  const { consorcioId } = await params;

  const [consorcio, allUnits, usersList] = await Promise.all([
    getConsorcioForAdmin(user, consorcioId),
    getUnitsForAdmin(user),
    getUsersForAdmin(user, { consorcioId }),
  ]);
  if (!consorcio) notFound();

  const consorcios = [consorcio];
  const units = allUnits.filter((u) => u.consorcioId === consorcioId);

  // La pantalla se agrupa por unidad, que es como piensa el admin ("¿quién
  // está en el 3° B?") y como está ordenado el reporte del mes.
  const byUnit = new Map<string, UnitGroup>();
  for (const unit of units) {
    byUnit.set(unit.id, {
      unitId: unit.id,
      label: unit.label,
      floor: unit.floor,
      people: [],
    });
  }

  const withoutUnit: Assignment[] = [];
  for (const row of usersList) {
    for (const membership of row.memberships) {
      const assignment: Assignment = {
        membership,
        userId: row.id,
        userName: row.name,
        userEmail: row.email,
      };
      const unit = membership.unitId ? byUnit.get(membership.unitId) : undefined;
      if (unit) unit.people.push(assignment);
      else withoutUnit.push(assignment);
    }
  }

  const floorMap = new Map<string, UnitGroup[]>();
  for (const unit of byUnit.values()) {
    const key = unit.floor ?? "";
    floorMap.set(key, [...(floorMap.get(key) ?? []), unit]);
  }
  const floors: FloorGroup[] = Array.from(floorMap.entries())
    .sort(([a], [b]) => a.localeCompare(b, "es", { numeric: true }))
    .map(([floor, unitsInFloor]) => ({
      floor,
      units: unitsInFloor.sort((a, b) =>
        a.label.localeCompare(b.label, "es", { numeric: true }),
      ),
    }));

  const hasSomething = floors.length > 0 || withoutUnit.length > 0;

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <PageHeader
          backHref={`/admin/${consorcioId}`}
          backLabel="Volver al panel del consorcio"
          icon={Users}
          tone="teal"
          title="Vecinos"
          subtitle={consorcio.name}
        />

        {hasSomething ? (
          <VecinosBoard
            consorcioId={consorcioId}
            consorcios={consorcios}
            units={units}
            floors={floors}
            withoutUnit={withoutUnit}
          />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <EmptyState
              icon={Users}
              tone="teal"
              title="Sin unidades ni vecinos"
              description="Cargá primero las unidades del consorcio y después asignales sus vecinos."
            />
            <NewVecinoButton
              consorcios={consorcios}
              units={units}
              className="h-12 px-5 text-base"
            />
          </div>
        )}
      </div>
    </main>
  );
}
