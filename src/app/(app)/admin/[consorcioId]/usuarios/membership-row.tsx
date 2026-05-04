"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X } from "lucide-react";
import { toast } from "sonner";
import {
  removeUserMembership,
  updateUserMembership,
  type ActionResult,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { roleLabel } from "@/lib/roles";
import type { UserMembershipRow } from "@/lib/queries/users";
import { formatUnitWithFloor } from "@/lib/format";
import type { AdminUnit } from "@/lib/queries/admin";

const ROLE_OPTIONS = [
  { label: "Propietario", value: "owner" },
  { label: "Inquilino", value: "tenant" },
  { label: "Administrador del consorcio", value: "admin" },
];

type Role = "admin" | "owner" | "tenant";

type Props = {
  membership: UserMembershipRow;
  unitsInConsorcio: AdminUnit[];
  consorcioId: string;
};

export function MembershipRow({
  membership,
  unitsInConsorcio,
  consorcioId,
}: Readonly<Props>) {
  const [editing, setEditing] = useState(false);
  const display = describeMembership(membership);

  if (editing) {
    return (
      <EditForm
        membership={membership}
        unitsInConsorcio={unitsInConsorcio}
        onClose={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
      <div className="min-w-0 flex-1 text-sm leading-tight">
        {membership.unitId ? (
          <Link
            href={`/admin/${consorcioId}/unidades#unit-${membership.unitId}`}
            className="hover:text-foreground hover:underline underline-offset-2"
          >
            {display}
          </Link>
        ) : (
          <span>{display}</span>
        )}
      </div>
      {membership.role !== "super_admin" && (
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setEditing(true)}
            aria-label={`Editar asignación: ${display}`}
            className="text-muted-foreground hover:text-foreground touch-manipulation"
          >
            <Pencil aria-hidden="true" className="size-4" />
          </Button>
          <RemoveButton membershipId={membership.membershipId} label={display} />
        </div>
      )}
    </div>
  );
}

function describeMembership(m: UserMembershipRow): string {
  const role = roleLabel(m.role);
  if (m.role === "super_admin") return role;
  const consorcioSuffix = m.consorcioName ? ` — ${m.consorcioName}` : "";
  if (m.role === "admin") {
    return `${role}${consorcioSuffix}`;
  }
  const unitPart = m.unitLabel ? `Unidad ${m.unitLabel}` : "";
  const consorcioPart = consorcioSuffix;
  return `${role} · ${unitPart}${consorcioPart}`;
}

function EditForm({
  membership,
  unitsInConsorcio,
  onClose,
}: Readonly<{
  membership: UserMembershipRow;
  unitsInConsorcio: AdminUnit[];
  onClose: () => void;
}>) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(updateUserMembership, null);

  const initialRole: Role =
    membership.role === "super_admin" ? "admin" : membership.role;

  const [role, setRole] = useState<Role>(initialRole);
  const [unitId, setUnitId] = useState<string>(
    membership.unitId ?? unitsInConsorcio[0]?.id ?? "",
  );

  const unitItems = useMemo(
    () =>
      unitsInConsorcio.map((u) => ({
        label: formatUnitWithFloor(u),
        value: u.id,
      })),
    [unitsInConsorcio],
  );

  const needsUnit = role === "owner" || role === "tenant";

  useEffect(() => {
    if (state?.ok) {
      toast.success("Asignación actualizada.");
      onClose();
      router.refresh();
    }
  }, [state, router, onClose]);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3"
    >
      <input
        type="hidden"
        name="membershipId"
        value={membership.membershipId}
      />
      <p className="text-xs text-muted-foreground">
        En {membership.consorcioName ?? "el consorcio"}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`edit-role-${membership.membershipId}`} className="text-sm">
            Rol
          </Label>
          <Select
            name="role"
            items={ROLE_OPTIONS}
            value={role}
            onValueChange={(v) => setRole((v as Role) ?? initialRole)}
            disabled={pending}
          >
            <SelectTrigger
              id={`edit-role-${membership.membershipId}`}
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

        {needsUnit && (
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor={`edit-unit-${membership.membershipId}`}
              className="text-sm"
            >
              Unidad
            </Label>
            {unitsInConsorcio.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                Sin unidades cargadas.
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
                  id={`edit-unit-${membership.membershipId}`}
                  className="h-11 w-full text-base"
                  data-size="default"
                >
                  <SelectValue placeholder="Elegí unidad" />
                </SelectTrigger>
                <SelectContent>
                  {unitsInConsorcio.map((u) => (
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

      <div className="flex items-center gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={pending || (needsUnit && unitsInConsorcio.length === 0)}
          className="touch-manipulation"
        >
          {pending ? "Guardando…" : "Guardar"}
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

function RemoveButton({
  membershipId,
  label,
}: Readonly<{ membershipId: string; label: string }>) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const onClick = async () => {
    if (!confirm(`¿Quitar “${label}”? Esta acción no se puede deshacer.`)) {
      return;
    }
    setPending(true);
    const result = await removeUserMembership(membershipId);
    setPending(false);
    if (result.ok) {
      toast.success("Asignación eliminada.");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={onClick}
      disabled={pending}
      aria-label={`Quitar asignación: ${label}`}
      className="text-muted-foreground hover:text-destructive touch-manipulation"
    >
      <X aria-hidden="true" className="size-4" />
    </Button>
  );
}
