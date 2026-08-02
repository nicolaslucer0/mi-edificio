"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, UserX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { roleLabel } from "@/lib/roles";
import type { AdminConsorcio, AdminUnit } from "@/lib/queries/admin";
import type { UserMembershipRow } from "@/lib/queries/users";
import { MembershipRow } from "./membership-row";
import { NewVecinoButton } from "./new-vecino-button";

export type Assignment = {
  membership: UserMembershipRow;
  userId: string;
  userName: string | null;
  userEmail: string;
};

export type UnitGroup = {
  unitId: string;
  label: string;
  floor: string | null;
  people: Assignment[];
};

export type FloorGroup = {
  /** Cadena vacía = unidades sin piso cargado. */
  floor: string;
  units: UnitGroup[];
};

type Props = {
  consorcioId: string;
  consorcios: AdminConsorcio[];
  units: AdminUnit[];
  floors: FloorGroup[];
  /** Administradores y demás asignaciones que no cuelgan de una unidad. */
  withoutUnit: Assignment[];
};

function matches(text: string | null | undefined, query: string): boolean {
  return (text ?? "").toLowerCase().includes(query);
}

function assignmentMatches(a: Assignment, query: string): boolean {
  return (
    matches(a.userName, query) ||
    matches(a.userEmail, query) ||
    matches(roleLabel(a.membership.role), query)
  );
}

export function VecinosBoard({
  consorcioId,
  consorcios,
  units,
  floors,
  withoutUnit,
}: Readonly<Props>) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();

  const filteredFloors = useMemo(() => {
    if (!normalized) return floors;
    return floors
      .map((floor) => ({
        ...floor,
        units: floor.units
          // Buscar por unidad trae la unidad entera; buscar por persona, solo
          // las personas que coinciden.
          .map((unit) => {
            const unitHit =
              matches(unit.label, normalized) ||
              matches(unit.floor, normalized);
            if (unitHit) return unit;
            const people = unit.people.filter((p) =>
              assignmentMatches(p, normalized),
            );
            return people.length > 0 ? { ...unit, people } : null;
          })
          .filter((u): u is UnitGroup => u !== null),
      }))
      .filter((floor) => floor.units.length > 0);
  }, [floors, normalized]);

  const filteredWithoutUnit = useMemo(() => {
    if (!normalized) return withoutUnit;
    return withoutUnit.filter((a) => assignmentMatches(a, normalized));
  }, [withoutUnit, normalized]);

  const stats = useMemo(() => {
    const allUnits = floors.flatMap((f) => f.units);
    const people = new Set<string>();
    for (const unit of allUnits) {
      for (const p of unit.people) people.add(p.userId);
    }
    for (const a of withoutUnit) people.add(a.userId);
    const occupied = allUnits.filter((u) => u.people.length > 0).length;
    return {
      people: people.size,
      occupied,
      empty: allUnits.length - occupied,
    };
  }, [floors, withoutUnit]);

  const nothingFound =
    filteredFloors.length === 0 && filteredWithoutUnit.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="buscar-vecino" className="text-base">
            Buscar
          </Label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="buscar-vecino"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nombre, email o unidad"
              autoComplete="off"
              spellCheck={false}
              className="h-12 pl-9 text-base"
            />
          </div>
        </div>
        <NewVecinoButton
          consorcios={consorcios}
          units={units}
          className="h-12 shrink-0 px-5 text-base"
        />
      </div>

      <dl className="grid grid-cols-3 gap-2 text-sm">
        <Stat label="Vecinos" value={stats.people} />
        <Stat label="Unidades ocupadas" value={stats.occupied} />
        <Stat label="Sin nadie" value={stats.empty} highlight={stats.empty > 0} />
      </dl>

      {nothingFound ? (
        <Card>
          <CardContent className="px-6 py-10 text-center">
            <p className="text-sm leading-relaxed text-muted-foreground">
              No hay vecinos ni unidades que coincidan con “{query}”.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div data-stagger className="flex flex-col gap-4">
          {filteredFloors.map((floor, idx) => (
            <Card
              key={floor.floor || "sin-piso"}
              style={{ "--stagger-index": idx } as React.CSSProperties}
            >
              <CardContent className="flex flex-col gap-3 p-5">
                <h3 className="text-sm font-semibold tracking-tight">
                  {floor.floor ? `Piso ${floor.floor}` : "Sin piso"}
                </h3>
                <ul className="flex flex-col divide-y divide-border/60">
                  {floor.units.map((unit) => (
                    <li key={unit.unitId} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          href={`/admin/${consorcioId}/unidades#unit-${unit.unitId}`}
                          className="text-sm font-medium hover:underline underline-offset-2 touch-manipulation"
                        >
                          Unidad {unit.label}
                        </Link>
                        {unit.people.length === 0 && (
                          <NewVecinoButton
                            consorcios={consorcios}
                            units={units}
                            unitId={unit.unitId}
                            label="Asignar"
                            variant="ghost"
                            className="h-9 text-sm text-muted-foreground hover:text-foreground"
                          />
                        )}
                      </div>

                      {unit.people.length === 0 ? (
                        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <UserX aria-hidden="true" className="size-3.5" />
                          Sin nadie asignado
                        </p>
                      ) : (
                        <ul
                          className="flex flex-col gap-2"
                          aria-label={`Vecinos de la unidad ${unit.label}`}
                        >
                          {unit.people.map((person) => (
                            <li key={person.membership.membershipId}>
                              <MembershipRow
                                membership={person.membership}
                                unitsInConsorcio={units}
                                consorcioId={consorcioId}
                                primary={person.userName ?? person.userEmail}
                                secondary={`${roleLabel(person.membership.role)}${
                                  person.userName ? ` · ${person.userEmail}` : ""
                                }`}
                              />
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

          {filteredWithoutUnit.length > 0 && (
            <Card>
              <CardContent className="flex flex-col gap-3 p-5">
                <h3 className="text-sm font-semibold tracking-tight">
                  Sin unidad
                </h3>
                <ul className="flex flex-col gap-2" aria-label="Sin unidad">
                  {filteredWithoutUnit.map((person) => (
                    <li key={person.membership.membershipId}>
                      <MembershipRow
                        membership={person.membership}
                        unitsInConsorcio={units}
                        consorcioId={consorcioId}
                        primary={person.userName ?? person.userEmail}
                        secondary={`${roleLabel(person.membership.role)}${
                          person.userName ? ` · ${person.userEmail}` : ""
                        }`}
                      />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: Readonly<{ label: string; value: number; highlight?: boolean }>) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-muted/50 px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={
          highlight
            ? "text-lg font-bold tabular-nums text-destructive"
            : "text-lg font-bold tabular-nums"
        }
      >
        {value}
      </dd>
    </div>
  );
}
