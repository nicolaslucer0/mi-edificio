"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateExpense, type ActionResult } from "@/lib/actions/admin";
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

const TYPE_OPTIONS = [
  { label: "Ordinaria", value: "ordinaria" },
  { label: "Extraordinaria", value: "extraordinaria" },
];

type Props = {
  id: string;
  consorcioId: string;
  unitDisplay: string;
  consorcioName: string;
  defaultPeriod: string;
  defaultDueDate: string;
  defaultAmountPesos: number;
  defaultType: "ordinaria" | "extraordinaria";
  defaultDescription: string;
};

function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function ExpenseEditForm(props: Readonly<Props>) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(updateExpense, null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Expensa actualizada.");
      router.push(`/admin/${props.consorcioId}/expensas`);
      router.refresh();
    }
  }, [state, router, props.consorcioId]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="id" value={props.id} />

      <p className="text-sm leading-relaxed text-muted-foreground">
        Editando:{" "}
        <span className="font-medium text-foreground">
          {props.unitDisplay} · {props.consorcioName}
        </span>
      </p>

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
            defaultValue={props.defaultPeriod}
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
            defaultValue={props.defaultDueDate}
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
            defaultValue={props.defaultAmountPesos}
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
            defaultValue={props.defaultType}
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
          defaultValue={props.defaultDescription}
          placeholder="Ej. Incluye obra de pintura del frente."
          disabled={pending}
        />
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
        disabled={pending}
        className="h-12 text-base touch-manipulation"
      >
        {pending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}

export { toDateInputValue };
