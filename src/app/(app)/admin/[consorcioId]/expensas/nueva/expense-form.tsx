"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createExpense,
  type CreateExpenseResult,
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
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  formatCurrencyCents,
  formatPeriod,
  formatUnitWithFloor,
} from "@/lib/format";
import type { AdminUnit } from "@/lib/queries/admin";

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function fieldValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}
// Order in which fields receive focus when invalid.
const FIELD_ORDER = ["period", "dueDate", "amountPesos"] as const;
type FieldErrors = Partial<Record<(typeof FIELD_ORDER)[number], string>>;

function buildSuccessMessage(state: {
  created: number;
  skipped: number;
}): string {
  if (state.created === 1) return "Expensa creada.";
  const skippedSuffix =
    state.skipped > 0 ? ` (${state.skipped} ya existían)` : "";
  return `${state.created} expensas creadas${skippedSuffix}.`;
}

type ConfirmData = {
  count: number;
  amountCents: number;
  period: string;
};

type Props = {
  consorcioId: string;
  consorcioName: string;
  units: AdminUnit[];
  defaultPeriod: string;
  defaultDueDate: string;
};

export function ExpenseForm({
  consorcioId,
  consorcioName,
  units,
  defaultPeriod,
  defaultDueDate,
}: Readonly<Props>) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    CreateExpenseResult | null,
    FormData
  >(createExpense, null);

  const formRef = useRef<HTMLFormElement>(null);
  const confirmedRef = useRef(false);

  const targetItems = useMemo(() => {
    const items: Array<{ label: string; value: string }> = [
      {
        label: `Todas las unidades de ${consorcioName}`,
        value: `consorcio:${consorcioId}`,
      },
    ];
    for (const u of units) {
      items.push({
        label: formatUnitWithFloor(u),
        value: `unit:${u.id}`,
      });
    }
    return items;
  }, [consorcioId, consorcioName, units]);

  const [target, setTarget] = useState<string>(targetItems[0]?.value ?? "");
  const [amount, setAmount] = useState<string>("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<ConfirmData | null>(null);

  const isBulk = target.startsWith("consorcio:");

  useEffect(() => {
    if (state?.ok) {
      confirmedRef.current = false;
      toast.success(buildSuccessMessage(state));
      router.push(`/admin/${consorcioId}/expensas`);
      router.refresh();
    }
  }, [state, router, consorcioId]);

  function validate(formData: FormData): FieldErrors {
    const next: FieldErrors = {};
    const period = fieldValue(formData, "period");
    const dueDate = fieldValue(formData, "dueDate");
    const amountPesos = fieldValue(formData, "amountPesos");
    if (!PERIOD_RE.test(period)) next.period = "Elegí el período (mes y año).";
    if (!DATE_RE.test(dueDate))
      next.dueDate = "Elegí la fecha de vencimiento.";
    if (!amountPesos || Number(amountPesos) <= 0)
      next.amountPesos = "Ingresá un monto mayor a 0.";
    return next;
  }

  function focusFirstError(next: FieldErrors) {
    const firstId = FIELD_ORDER.find((id) => next[id]);
    if (firstId) document.getElementById(firstId)?.focus();
  }

  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const next = validate(formData);
    if (Object.keys(next).length > 0) {
      event.preventDefault();
      setErrors(next);
      focusFirstError(next);
      return;
    }
    setErrors({});
    if (isBulk && !confirmedRef.current) {
      event.preventDefault();
      setConfirmData({
        count: units.length,
        amountCents: Number(fieldValue(formData, "amountPesos")) * 100,
        period: fieldValue(formData, "period"),
      });
      setConfirmOpen(true);
    }
  }

  function handleConfirm() {
    confirmedRef.current = true;
    setConfirmOpen(false);
    formRef.current?.requestSubmit();
  }

  return (
    <>
      <form
        ref={formRef}
        action={formAction}
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-5"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="target" className="text-base">
            Para quién
          </Label>
          <Select
            name="target"
            items={targetItems}
            value={target}
            onValueChange={(v) => setTarget(v ?? "")}
            disabled={pending}
          >
            <SelectTrigger
              id="target"
              className="h-12 w-full text-base"
              data-size="default"
            >
              <SelectValue placeholder="Elegí destino" />
            </SelectTrigger>
            <SelectContent>
              {targetItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Elegí “Todas las unidades” para crear una expensa por cada unidad
            del consorcio con el mismo monto.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="period" className="text-base">
              Período
            </Label>
            <Input
              id="period"
              name="period"
              type="month"
              defaultValue={defaultPeriod}
              className="h-12 text-base"
              disabled={pending}
              aria-invalid={errors.period ? true : undefined}
              aria-describedby={errors.period ? "period-error" : undefined}
            />
            {errors.period && (
              <p
                id="period-error"
                role="alert"
                className="text-sm text-destructive leading-relaxed"
              >
                {errors.period}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="dueDate" className="text-base">
              Vencimiento
            </Label>
            <Input
              id="dueDate"
              name="dueDate"
              type="date"
              defaultValue={defaultDueDate}
              className="h-12 text-base"
              disabled={pending}
              aria-invalid={errors.dueDate ? true : undefined}
              aria-describedby={errors.dueDate ? "dueDate-error" : undefined}
            />
            {errors.dueDate && (
              <p
                id="dueDate-error"
                role="alert"
                className="text-sm text-destructive leading-relaxed"
              >
                {errors.dueDate}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="amountPesos" className="text-base">
              Monto (en pesos)
            </Label>
            <CurrencyInput
              id="amountPesos"
              name="amountPesos"
              value={amount}
              onValueChange={setAmount}
              placeholder="105.000"
              disabled={pending}
              invalid={Boolean(errors.amountPesos)}
              describedById={errors.amountPesos ? "amountPesos-error" : undefined}
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="type" className="text-base">
              Tipo
            </Label>
            <Select name="type" defaultValue="ordinaria" disabled={pending}>
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
          <p
            role="alert"
            aria-live="polite"
            className="text-sm text-destructive leading-relaxed"
          >
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

      <Drawer open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>¿Crear para todo el consorcio?</DrawerTitle>
            <DrawerDescription>
              {confirmData &&
                `Vas a crear una expensa de ${formatCurrencyCents(
                  confirmData.amountCents,
                )} en cada una de las ${confirmData.count} ${
                  confirmData.count === 1 ? "unidad" : "unidades"
                } de ${consorcioName}, período ${formatPeriod(
                  confirmData.period,
                )}.`}
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={pending}
              className="h-12 text-base touch-manipulation"
            >
              Sí, crear {confirmData?.count ?? ""} expensas
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              disabled={pending}
              className="h-11 touch-manipulation"
            >
              Cancelar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
