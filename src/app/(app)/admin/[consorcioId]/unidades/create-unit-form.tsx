"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createUnit, type ActionResult } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  consorcioId: string;
};

export function CreateUnitForm({ consorcioId }: Readonly<Props>) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(createUnit, null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Unidad agregada.");
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-4"
    >
      <input type="hidden" name="consorcioId" value={consorcioId} />
      <p className="text-sm font-medium">Agregar unidad</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`floor-${consorcioId}`} className="text-sm">
            Piso{" "}
            <span className="font-normal text-muted-foreground">
              (opcional)
            </span>
          </Label>
          <Input
            id={`floor-${consorcioId}`}
            name="floor"
            maxLength={20}
            placeholder="Ej. 3, PB"
            autoComplete="off"
            className="h-11 text-base"
            disabled={pending}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`label-${consorcioId}`} className="text-sm">
            Unidad
          </Label>
          <Input
            id={`label-${consorcioId}`}
            name="label"
            required
            minLength={1}
            maxLength={40}
            placeholder="Ej. A, 1, 4"
            autoComplete="off"
            className="h-11 text-base"
            disabled={pending}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`coefficient-${consorcioId}`} className="text-sm">
            Coeficiente %{" "}
            <span className="font-normal text-muted-foreground">
              (opcional)
            </span>
          </Label>
          <Input
            id={`coefficient-${consorcioId}`}
            name="coefficient"
            type="text"
            inputMode="decimal"
            placeholder="Ej. 10,3"
            autoComplete="off"
            className="h-11 text-base"
            disabled={pending}
          />
        </div>
      </div>
      <Button
        type="submit"
        disabled={pending}
        className="h-11 text-base touch-manipulation"
      >
        {pending ? "Agregando…" : "Agregar"}
      </Button>
      {state && !state.ok && (
        <p
          role="alert"
          aria-live="polite"
          className="text-sm leading-relaxed text-destructive"
        >
          {state.error}
        </p>
      )}
    </form>
  );
}
