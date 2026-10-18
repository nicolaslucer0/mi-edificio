"use client";

import { useState, type ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { MAX_RECEIPT_BYTES, shrinkImage } from "@/lib/shrink-image";
import { cn } from "@/lib/utils";

/**
 * El campo del comprobante. Achica la foto apenas se elige y la deja lista en
 * el mismo input, así el formulario la manda como siempre. Si sigue siendo
 * muy pesada, lo dice antes de enviar en vez de después.
 */
export function ReceiptInput({
  id,
  disabled,
  hintId,
  className,
}: Readonly<{
  id: string;
  disabled?: boolean;
  /** Id del texto de ayuda, para aria-describedby. */
  hintId?: string;
  className?: string;
}>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    setError(null);
    if (!file) return;

    setBusy(true);
    const ready = await shrinkImage(file);
    setBusy(false);

    if (ready.size > MAX_RECEIPT_BYTES) {
      input.value = "";
      setError(
        "El archivo es muy pesado. Probá con una captura de pantalla del comprobante.",
      );
      return;
    }
    if (ready !== file) {
      const transfer = new DataTransfer();
      transfer.items.add(ready);
      input.files = transfer.files;
    }
  }

  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <Input
        id={id}
        name="receipt"
        type="file"
        accept="image/*,application/pdf"
        onChange={handleChange}
        // No se deshabilita mientras achica: un input deshabilitado no viaja
        // en el formulario.
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [hintId, error ? errorId : null].filter(Boolean).join(" ") ||
          undefined
        }
        className={cn(
          "h-12 text-base file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-muted/80",
          className,
        )}
      />
      {busy && (
        <p aria-live="polite" className="text-sm text-muted-foreground">
          Preparando la foto…
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
