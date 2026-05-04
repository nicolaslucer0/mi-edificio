"use client";

import { useActionState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createExpense,
  type ActionResult,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatUnitWithFloor } from "@/lib/format";
import type { AdminUnit } from "@/lib/queries/admin";

const TYPE_OPTIONS = [
  { label: "Ordinaria", value: "ordinaria" },
  { label: "Extraordinaria", value: "extraordinaria" },
];

type Props = {
  units: AdminUnit[];
  defaultPeriod: string;
  defaultDueDate: string;
};

export function ExpenseForm({
  units,
  defaultPeriod,
  defaultDueDate,
}: Readonly<Props>) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(createExpense, null);

  const unitItems = useMemo(
    () =>
      units.map((u) => ({
        label: `${formatUnitWithFloor(u)} — ${u.consorcioName}`,
        value: u.id,
      })),
    [units],
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success("Expensa creada.");
      router.push("/admin");
      router.refresh();
    }
  }, [state, router]);

  if (units.length === 0) {
    return (
      <p className="text-sm text-muted-foreground leading-relaxed">
        No hay unidades cargadas todavía.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="unitId" className="text-base">
          Unidad
        </Label>
        <Select
          name="unitId"
          items={unitItems}
          defaultValue={units[0].id}
          disabled={pending}
        >
          <SelectTrigger
            id="unitId"
            className="h-12 w-full text-base"
            data-size="default"
          >
            <SelectValue placeholder="Elegí una unidad" />
          </SelectTrigger>
          <SelectContent>
            {units.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {formatUnitWithFloor(u)} — {u.consorcioName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="period" className="text-base">
            Período
          </Label>
          <Input
            id="period"
            name="period"
            required
            pattern="\d{4}-(0[1-9]|1[0-2])"
            placeholder="2026-05"
            defaultValue={defaultPeriod}
            className="h-12 text-base font-mono"
            disabled={pending}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="dueDate" className="text-base">
            Vencimiento
          </Label>
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            required
            defaultValue={defaultDueDate}
            className="h-12 text-base"
            disabled={pending}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="amountPesos" className="text-base">
            Monto (en pesos)
          </Label>
          <Input
            id="amountPesos"
            name="amountPesos"
            type="number"
            required
            min={1}
            step={1}
            placeholder="105000"
            className="h-12 text-base tabular-nums"
            disabled={pending}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="type" className="text-base">
            Tipo
          </Label>
          <Select
            name="type"
            items={TYPE_OPTIONS}
            defaultValue="ordinaria"
            disabled={pending}
          >
            <SelectTrigger
              id="type"
              className="h-12 w-full text-base"
              data-size="default"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ordinaria">Ordinaria</SelectItem>
              <SelectItem value="extraordinaria">Extraordinaria</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description" className="text-base">
          Descripción (opcional)
        </Label>
        <Textarea
          id="description"
          name="description"
          rows={2}
          maxLength={500}
          placeholder="Ej. Incluye obra de pintura del frente."
          disabled={pending}
        />
      </div>

      {state && !state.ok && (
        <p role="alert" className="text-sm text-destructive leading-relaxed">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="h-12 text-base touch-manipulation"
      >
        {pending ? "Creando…" : "Crear expensa"}
      </Button>
    </form>
  );
}
