"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addUserMembership, type ActionResult } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatUnitWithFloor } from "@/lib/format";
import type { AdminConsorcio, AdminUnit } from "@/lib/queries/admin";

type Role = "admin" | "owner" | "tenant";

const ROLE_OPTIONS: Array<{ value: Role; label: string }> = [
  { value: "owner", label: "Propietario" },
  { value: "tenant", label: "Inquilino" },
  { value: "admin", label: "Administrador del consorcio" },
];

type Props = {
  consorcios: AdminConsorcio[];
  units: AdminUnit[];
};

export function AddMembershipForm({ consorcios, units }: Readonly<Props>) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(addUserMembership, null);

  const [role, setRole] = useState<Role>("owner");
  const [consorcioId, setConsorcioId] = useState<string>(
    consorcios[0]?.id ?? "",
  );

  const filteredUnits = useMemo(
    () => units.filter((u) => u.consorcioId === consorcioId),
    [units, consorcioId],
  );

  const consorcioItems = useMemo(
    () => consorcios.map((c) => ({ label: c.name, value: c.id })),
    [consorcios],
  );

  const unitItems = useMemo(
    () =>
      filteredUnits.map((u) => ({
        label: formatUnitWithFloor(u),
        value: u.id,
      })),
    [filteredUnits],
  );

  const [unitId, setUnitId] = useState<string>(filteredUnits[0]?.id ?? "");

  useEffect(() => {
    setUnitId(filteredUnits[0]?.id ?? "");
  }, [filteredUnits]);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Asignación agregada.");
      router.refresh();
    }
  }, [state, router]);

  if (consorcios.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-muted-foreground">
        No hay consorcios para administrar.
      </p>
    );
  }

  const needsUnit = role === "owner" || role === "tenant";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="text-base">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            inputMode="email"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="vecino@ejemplo.com"
            className="h-12 text-base"
            disabled={pending}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="name" className="text-base">
            Nombre{" "}
            <span className="font-normal text-muted-foreground">
              (opcional)
            </span>
          </Label>
          <Input
            id="name"
            name="name"
            autoComplete="off"
            placeholder="Ej. Juan Pérez"
            className="h-12 text-base"
            disabled={pending}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="role" className="text-base">
          Rol
        </Label>
        <Select
          name="role"
          items={ROLE_OPTIONS}
          value={role}
          onValueChange={(v) => setRole(v as Role)}
          disabled={pending}
        >
          <SelectTrigger
            id="role"
            className="h-12 w-full text-base"
            data-size="default"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="consorcioId" className="text-base">
            Consorcio
          </Label>
          <Select
            name="consorcioId"
            items={consorcioItems}
            value={consorcioId}
            onValueChange={(v) => setConsorcioId(v ?? "")}
            disabled={pending}
          >
            <SelectTrigger
              id="consorcioId"
              className="h-12 w-full text-base"
              data-size="default"
            >
              <SelectValue placeholder="Elegí consorcio" />
            </SelectTrigger>
            <SelectContent>
              {consorcios.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {needsUnit && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="unitId" className="text-base">
              Unidad
            </Label>
            {filteredUnits.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-3 text-sm leading-relaxed text-muted-foreground">
                Este consorcio no tiene unidades cargadas.
              </p>
            ) : (
              <Select
                name="unitId"
                items={unitItems}
                value={unitId}
                onValueChange={(v) => setUnitId(v ?? "")}
                disabled={pending}
              >
                <SelectTrigger
                  id="unitId"
                  className="h-12 w-full text-base"
                  data-size="default"
                >
                  <SelectValue placeholder="Elegí unidad" />
                </SelectTrigger>
                <SelectContent>
                  {filteredUnits.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {formatUnitWithFloor(u)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </div>

      {state && !state.ok && (
        <p
          role="alert"
          aria-live="polite"
          className="text-sm leading-relaxed text-destructive"
        >
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        disabled={pending || (needsUnit && filteredUnits.length === 0)}
        className="h-12 text-base touch-manipulation"
      >
        {pending ? "Agregando…" : "Agregar vecino"}
      </Button>
    </form>
  );
}
