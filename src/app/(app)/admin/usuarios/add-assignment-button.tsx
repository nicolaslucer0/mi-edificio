"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { addUserMembership, type ActionResult } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
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
  email: string;
  consorcios: AdminConsorcio[];
  units: AdminUnit[];
};

export function AddAssignmentButton({
  email,
  consorcios,
  units,
}: Readonly<Props>) {
  const [open, setOpen] = useState(false);

  if (consorcios.length === 0) return null;

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="self-start text-muted-foreground hover:text-foreground touch-manipulation"
      >
        <Plus aria-hidden="true" className="size-4" />
        Agregar asignación
      </Button>
    );
  }

  return (
    <AssignmentForm
      email={email}
      consorcios={consorcios}
      units={units}
      onClose={() => setOpen(false)}
    />
  );
}

function AssignmentForm({
  email,
  consorcios,
  units,
  onClose,
}: Readonly<Props & { onClose: () => void }>) {
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
      onClose();
      router.refresh();
    }
  }, [state, router, onClose]);

  const needsUnit = role === "owner" || role === "tenant";

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3"
    >
      <input type="hidden" name="email" value={email} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`add-role-${email}`} className="text-sm">
            Rol
          </Label>
          <Select
            name="role"
            items={ROLE_OPTIONS}
            value={role}
            onValueChange={(v) => setRole((v as Role) ?? "owner")}
            disabled={pending}
          >
            <SelectTrigger
              id={`add-role-${email}`}
              className="h-11 w-full text-base"
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

        {consorcios.length > 1 && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`add-consorcio-${email}`} className="text-sm">
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
                id={`add-consorcio-${email}`}
                className="h-11 w-full text-base"
                data-size="default"
              >
                <SelectValue />
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
        )}
      </div>

      {consorcios.length === 1 && (
        <input type="hidden" name="consorcioId" value={consorcioId} />
      )}

      {needsUnit && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`add-unit-${email}`} className="text-sm">
            Unidad
          </Label>
          {filteredUnits.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs leading-relaxed text-muted-foreground">
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
                id={`add-unit-${email}`}
                className="h-11 w-full text-base"
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

      {state && !state.ok && (
        <p
          role="alert"
          aria-live="polite"
          className="text-sm leading-relaxed text-destructive"
        >
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={pending || (needsUnit && filteredUnits.length === 0)}
          className="touch-manipulation"
        >
          {pending ? "Agregando…" : "Agregar"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onClose}
          disabled={pending}
          className="touch-manipulation"
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
