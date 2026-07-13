"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createExpenditure,
  updateExpenditure,
  type ActionResult,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
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
import {
  EXPENDITURE_CATEGORIES,
  formatExpenditureCategory,
  type ExpenditureCategory,
} from "@/lib/format";
import type { AdminConsorcio } from "@/lib/queries/admin";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const FIELD_ORDER = ["description", "date", "amountPesos"] as const;
type FieldErrors = Partial<Record<(typeof FIELD_ORDER)[number], string>>;

function fieldValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function getButtonLabel({
  pending,
  isEdit,
}: {
  pending: boolean;
  isEdit: boolean;
}): string {
  if (pending && isEdit) return "Guardando…";
  if (pending) return "Creando…";
  if (isEdit) return "Guardar cambios";
  return "Guardar gasto";
}

export type ExpenditureFormInitialValues = {
  id: string;
  consorcioId: string;
  date: string;
  description: string;
  amountPesos: number;
  category: ExpenditureCategory;
  vendor: string | null;
  notes: string | null;
  receiptUrl: string | null;
};

type Props = {
  consorciosList: AdminConsorcio[];
  consorcioId: string;
  defaultDate: string;
  initialValues?: ExpenditureFormInitialValues;
};

export function ExpenditureForm({
  consorciosList,
  consorcioId,
  defaultDate,
  initialValues,
}: Readonly<Props>) {
  const router = useRouter();
  const isEdit = !!initialValues;

  const action = isEdit ? updateExpenditure : createExpenditure;
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(action, null);

  const [amount, setAmount] = useState<string>(
    initialValues?.amountPesos ? String(initialValues.amountPesos) : "",
  );
  const [errors, setErrors] = useState<FieldErrors>({});

  const consorcioItems = useMemo(
    () => consorciosList.map((c) => ({ label: c.name, value: c.id })),
    [consorciosList],
  );

  const categoryItems = useMemo(
    () =>
      EXPENDITURE_CATEGORIES.map((c) => ({
        label: formatExpenditureCategory(c),
        value: c,
      })),
    [],
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success(isEdit ? "Gasto actualizado." : "Gasto registrado.");
      router.push(`/admin/${consorcioId}/gastos`);
      router.refresh();
    }
  }, [state, router, isEdit, consorcioId]);

  if (consorciosList.length === 0) {
    return (
      <p className="text-sm text-muted-foreground leading-relaxed">
        No hay consorcios para administrar.
      </p>
    );
  }

  const showConsorcioSelect = consorciosList.length > 1 && !isEdit;
  const defaultConsorcioId =
    initialValues?.consorcioId ?? consorciosList[0].id;

  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const next: FieldErrors = {};
    const description = fieldValue(formData, "description").trim();
    const date = fieldValue(formData, "date");
    const amountPesos = fieldValue(formData, "amountPesos");
    if (description.length < 3)
      next.description = "Contá en pocas palabras qué se gastó.";
    if (!DATE_RE.test(date)) next.date = "Elegí la fecha del gasto.";
    if (!amountPesos || Number(amountPesos) <= 0)
      next.amountPesos = "Ingresá un monto mayor a 0.";

    if (Object.keys(next).length > 0) {
      event.preventDefault();
      setErrors(next);
      const firstId = FIELD_ORDER.find((id) => next[id]);
      if (firstId) document.getElementById(firstId)?.focus();
      return;
    }
    setErrors({});
  }

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-5"
    >
      {isEdit && <input type="hidden" name="id" value={initialValues.id} />}
      {showConsorcioSelect ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="consorcioId" className="text-base">
            Consorcio
          </Label>
          <Select
            name="consorcioId"
            items={consorcioItems}
            defaultValue={defaultConsorcioId}
            disabled={pending}
          >
            <SelectTrigger
              id="consorcioId"
              className="h-12 w-full text-base"
              data-size="default"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {consorciosList.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <input type="hidden" name="consorcioId" value={defaultConsorcioId} />
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="description" className="text-base">
          ¿Qué se gastó?
        </Label>
        <Input
          id="description"
          name="description"
          minLength={3}
          maxLength={200}
          defaultValue={initialValues?.description ?? ""}
          placeholder="Ej. Corte de pasto del frente"
          autoComplete="off"
          className="h-12 text-base"
          disabled={pending}
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={
            errors.description ? "description-error" : undefined
          }
        />
        {errors.description && (
          <p
            id="description-error"
            role="alert"
            className="text-sm text-destructive leading-relaxed"
          >
            {errors.description}
          </p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="date" className="text-base">
            Fecha
          </Label>
          <Input
            id="date"
            name="date"
            type="date"
            defaultValue={initialValues?.date ?? defaultDate}
            className="h-12 text-base"
            disabled={pending}
            aria-invalid={errors.date ? true : undefined}
            aria-describedby={errors.date ? "date-error" : undefined}
          />
          {errors.date && (
            <p
              id="date-error"
              role="alert"
              className="text-sm text-destructive leading-relaxed"
            >
              {errors.date}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="amountPesos" className="text-base">
            Monto (en pesos)
          </Label>
          <CurrencyInput
            id="amountPesos"
            name="amountPesos"
            value={amount}
            onValueChange={setAmount}
            placeholder="50.000"
            disabled={pending}
            invalid={Boolean(errors.amountPesos)}
            describedById={
              errors.amountPesos ? "amountPesos-error" : undefined
            }
          />
          {errors.amountPesos && (
            <p
              id="amountPesos-error"
              role="alert"
              className="text-sm text-destructive leading-relaxed"
            >
              {errors.amountPesos}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="category" className="text-base">
          Categoría
        </Label>
        <Select
          name="category"
          items={categoryItems}
          defaultValue={initialValues?.category ?? "mantenimiento"}
          disabled={pending}
        >
          <SelectTrigger
            id="category"
            className="h-12 w-full text-base"
            data-size="default"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EXPENDITURE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {formatExpenditureCategory(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="vendor" className="text-base">
          Quién lo hizo (opcional)
        </Label>
        <Input
          id="vendor"
          name="vendor"
          maxLength={120}
          defaultValue={initialValues?.vendor ?? ""}
          placeholder="Ej. Juan Pérez (jardinero)"
          autoComplete="off"
          className="h-12 text-base"
          disabled={pending}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="receipt" className="text-base">
          Comprobante (opcional)
        </Label>
        {initialValues?.receiptUrl && (
          <a
            href={`/api/receipts/expenditure/${initialValues.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline underline-offset-2 hover:text-foreground text-muted-foreground"
          >
            Ver comprobante actual
          </a>
        )}
        <Input
          id="receipt"
          name="receipt"
          type="file"
          accept="image/*,application/pdf"
          className="h-12 text-base file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-muted/80"
          disabled={pending}
        />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Imagen o PDF, hasta 4MB.
          {initialValues?.receiptUrl &&
            " Si subís uno nuevo, reemplaza al actual."}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes" className="text-base">
          Notas (opcional)
        </Label>
        <Textarea
          id="notes"
          name="notes"
          rows={2}
          maxLength={500}
          defaultValue={initialValues?.notes ?? ""}
          placeholder="Ej. Próximo corte estimado en 3 semanas."
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
        {getButtonLabel({ pending, isEdit })}
      </Button>
    </form>
  );
}
