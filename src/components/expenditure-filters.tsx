"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  EXPENDITURE_CATEGORIES,
  formatExpenditureCategory,
  formatPeriod,
} from "@/lib/format";

const ALL_VALUE = "__all__";

function lastMonths(n: number): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  return out;
}

type Props = {
  category: string | undefined;
  month: string | undefined;
  basePath?: string;
};

export function ExpenditureFilters({
  category,
  month,
  basePath = "/gastos",
}: Readonly<Props>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const months = useMemo(() => lastMonths(12), []);

  const categoryItems = useMemo(
    () => [
      { label: "Todas las categorías", value: ALL_VALUE },
      ...EXPENDITURE_CATEGORIES.map((c) => ({
        label: formatExpenditureCategory(c),
        value: c,
      })),
    ],
    [],
  );

  const monthItems = useMemo(
    () => [
      { label: "Todos los meses", value: ALL_VALUE },
      ...months.map((m) => ({ label: formatPeriod(m), value: m })),
    ],
    [months],
  );

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== ALL_VALUE) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${basePath}?${qs}` : basePath);
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="filter-category" className="text-sm">
          Categoría
        </Label>
        <Select
          items={categoryItems}
          value={category ?? ALL_VALUE}
          onValueChange={(v) => setParam("category", v)}
          disabled={pending}
        >
          <SelectTrigger
            id="filter-category"
            className="h-11 w-full text-base"
            data-size="default"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Todas las categorías</SelectItem>
            {EXPENDITURE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {formatExpenditureCategory(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="filter-month" className="text-sm">
          Mes
        </Label>
        <Select
          items={monthItems}
          value={month ?? ALL_VALUE}
          onValueChange={(v) => setParam("month", v)}
          disabled={pending}
        >
          <SelectTrigger
            id="filter-month"
            className="h-11 w-full text-base"
            data-size="default"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Todos los meses</SelectItem>
            {months.map((m) => (
              <SelectItem key={m} value={m}>
                {formatPeriod(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
