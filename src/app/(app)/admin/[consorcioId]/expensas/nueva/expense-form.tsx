"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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
import { formatCurrencyCents, formatUnitWithFloor } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminUnit } from "@/lib/queries/admin";

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type Mode = "fixed" | "split" | "single";
type ExpenseType = "ordinaria" | "extraordinaria";
type FieldErrors = Partial<
  Record<"period" | "dueDate" | "unitId" | "amount", string>
>;

function fieldValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function buildSuccessMessage(state: {
  created: number;
  skipped: number;
}): string {
  if (state.created === 1) return "Expensa creada.";
  const skippedSuffix =
    state.skipped > 0 ? ` (${state.skipped} ya existían)` : "";
  return `${state.created} expensas creadas${skippedSuffix}.`;
}

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

  const [type, setType] = useState<ExpenseType>("ordinaria");
  const [mode, setMode] = useState<Mode>("fixed");
  const [amount, setAmount] = useState<string>("");
  const [total, setTotal] = useState<string>("");
  const [unitId, setUnitId] = useState<string>(units[0]?.id ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const allHaveCoef =
    units.length > 0 &&
    units.every((u) => u.coefficient != null && Number(u.coefficient) > 0);

  const unitItems = units.map((u) => ({
    label: formatUnitWithFloor(u),
    value: u.id,
  }));

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
    if (!PERIOD_RE.test(fieldValue(formData, "period")))
      next.period = "Elegí el período (mes y año).";
    if (!DATE_RE.test(fieldValue(formData, "dueDate")))
      next.dueDate = "Elegí la fecha de vencimiento.";
    if (mode === "single" && !unitId) next.unitId = "Elegí el departamento.";
    const amountField = mode === "split" ? "totalPesos" : "amountPesos";
    if (Number(fieldValue(formData, amountField)) <= 0)
      next.amount = "Ingresá un monto mayor a 0.";
    return next;
  }

  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const next = validate(formData);
    if (Object.keys(next).length > 0) {
      event.preventDefault();
      setErrors(next);
      return;
    }
    setErrors({});
    // Confirmar antes de crear para todo el consorcio (fijo o repartir).
    if (mode !== "single" && !confirmedRef.current) {
      event.preventDefault();
      setConfirmOpen(true);
    }
  }

  function handleConfirm() {
    confirmedRef.current = true;
    setConfirmOpen(false);
    formRef.current?.requestSubmit();
  }

  const perUnitEqual =
    units.length > 0 && Number(total) > 0
      ? Math.round(Number(total) / units.length)
      : 0;

  return (
    <>
      <form
        ref={formRef}
        action={formAction}
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-5"
      >
        <input type="hidden" name="consorcioId" value={consorcioId} />
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="type" value={type} />

        {/* Paso 1: tipo */}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-base font-medium">Tipo</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["ordinaria", "extraordinaria"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                aria-pressed={type === t}
                className={cn(
                  "h-11 rounded-lg border text-sm font-medium touch-manipulation transition-colors",
                  type === t
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border/60 text-muted-foreground hover:bg-muted/50",
                )}
              >
                {t === "ordinaria" ? "Ordinaria" : "Extraordinaria"}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Paso 2: cómo se cobra */}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-base font-medium">Cómo se cobra</legend>
          {(
            [
              { value: "fixed", label: "Un monto fijo para cada depto" },
              { value: "split", label: "Repartir un total entre los deptos" },
              { value: "single", label: "Cobrar a un depto puntual" },
            ] as const
          ).map((o) => (
            <label
              key={o.value}
              className="flex items-center gap-3 rounded-lg border border-border/60 p-3 touch-manipulation has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <input
                type="radio"
                name="mode-choice"
                checked={mode === o.value}
                onChange={() => setMode(o.value)}
                className="size-4 accent-primary"
                disabled={pending}
              />
              <span className="text-sm">{o.label}</span>
            </label>
          ))}
        </fieldset>

        {/* Campos según el modo */}
        {mode === "single" && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="unitId" className="text-base">
              Departamento
            </Label>
            <Select
              name="unitId"
              items={unitItems}
              value={unitId}
              onValueChange={(v) => setUnitId(v ?? "")}
              disabled={pending}
            >
              <SelectTrigger id="unitId" className="h-12 w-full text-base">
                <SelectValue placeholder="Elegí el depto" />
              </SelectTrigger>
              <SelectContent>
                {unitItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.unitId && (
              <p role="alert" className="text-sm text-destructive">
                {errors.unitId}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label
            htmlFor={mode === "split" ? "totalPesos" : "amountPesos"}
            className="text-base"
          >
            {mode === "split"
              ? "Monto total a repartir (en pesos)"
              : mode === "fixed"
                ? "Monto por departamento (en pesos)"
                : "Monto (en pesos)"}
          </Label>
          {mode === "split" ? (
            <CurrencyInput
              id="totalPesos"
              name="totalPesos"
              value={total}
              onValueChange={setTotal}
              placeholder="234.542"
              disabled={pending}
              invalid={Boolean(errors.amount)}
            />
          ) : (
            <CurrencyInput
              id="amountPesos"
              name="amountPesos"
              value={amount}
              onValueChange={setAmount}
              placeholder="105.000"
              disabled={pending}
              invalid={Boolean(errors.amount)}
            />
          )}
          {mode === "split" && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {allHaveCoef
                ? "Se reparte según el coeficiente de cada depto."
                : `Se reparte en partes iguales entre ${units.length} deptos${
                    perUnitEqual > 0
                      ? ` (≈ ${formatCurrencyCents(perUnitEqual * 100)} c/u)`
                      : ""
                  }.`}
            </p>
          )}
          {errors.amount && (
            <p role="alert" className="text-sm text-destructive">
              {errors.amount}
            </p>
          )}
        </div>

        {/* Período + vencimiento */}
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
            />
            {errors.period && (
              <p role="alert" className="text-sm text-destructive">
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
            />
            {errors.dueDate && (
              <p role="alert" className="text-sm text-destructive">
                {errors.dueDate}
              </p>
            )}
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
              {mode === "fixed"
                ? `Vas a crear una expensa de ${formatCurrencyCents(
                    Number(amount) * 100,
                  )} en cada uno de los ${units.length} deptos de ${consorcioName}.`
                : `Vas a repartir ${formatCurrencyCents(
                    Number(total) * 100,
                  )} entre los ${units.length} deptos de ${consorcioName}${
                    allHaveCoef
                      ? " según su coeficiente"
                      : " en partes iguales"
                  }.`}
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={pending}
              className="h-12 text-base touch-manipulation"
            >
              Sí, crear
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
