"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createConsorcio, type ActionResult } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TYPE_OPTIONS = [
  { label: "Edificio", value: "edificio" },
  { label: "PH", value: "ph" },
  { label: "Barrio cerrado", value: "barrio_cerrado" },
];

export function CreateConsorcioForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(createConsorcio, null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Consorcio creado.");
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name" className="text-base">
          Nombre
        </Label>
        <Input
          id="name"
          name="name"
          required
          minLength={3}
          maxLength={120}
          placeholder="Ej. Consorcio Av. Corrientes 1234"
          autoComplete="off"
          className="h-12 text-base"
          disabled={pending}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="type" className="text-base">
            Tipo
          </Label>
          <Select
            name="type"
            items={TYPE_OPTIONS}
            defaultValue="edificio"
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
              {TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="address" className="text-base">
            Dirección{" "}
            <span className="font-normal text-muted-foreground">
              (opcional)
            </span>
          </Label>
          <Input
            id="address"
            name="address"
            maxLength={200}
            placeholder="Calle 123, CABA"
            autoComplete="off"
            className="h-12 text-base"
            disabled={pending}
          />
        </div>
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
        {pending ? "Creando…" : "Crear consorcio"}
      </Button>
    </form>
  );
}
