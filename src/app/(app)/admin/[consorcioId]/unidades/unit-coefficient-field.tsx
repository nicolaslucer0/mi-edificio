"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { setUnitCoefficient } from "@/lib/actions/admin";

export function UnitCoefficientField({
  unitId,
  coefficient,
}: Readonly<{ unitId: string; coefficient: string | null }>) {
  const router = useRouter();
  const [value, setValue] = useState(coefficient ?? "");
  const [pending, startTransition] = useTransition();

  const dirty = value.trim().replace(",", ".") !== (coefficient ?? "");

  function handleSave() {
    startTransition(async () => {
      const result = await setUnitCoefficient(unitId, value);
      if (result.ok) {
        toast.success("Coeficiente guardado.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="mt-1.5 flex items-center gap-2">
      <label
        htmlFor={`coef-${unitId}`}
        className="text-xs text-muted-foreground"
      >
        Coef. %
      </label>
      <Input
        id={`coef-${unitId}`}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="—"
        disabled={pending}
        className="h-8 w-24 text-sm"
      />
      {dirty && (
        <Button
          type="button"
          variant="ghost"
          onClick={handleSave}
          disabled={pending}
          className="h-8 px-2 text-xs touch-manipulation"
        >
          {pending ? "…" : "Guardar"}
        </Button>
      )}
    </div>
  );
}
