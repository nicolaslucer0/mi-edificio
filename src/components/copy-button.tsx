"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Copia un dato para pegarlo en la app del banco. Mantener apretado para
 * seleccionar un CBU de 22 dígitos es justo lo que cuesta en el celular.
 */
export function CopyButton({
  value,
  label,
}: Readonly<{ value: string; label: string }>) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar. Mantené apretado el texto para copiarlo.");
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleCopy}
      aria-label={`Copiar ${label}`}
      className="h-11 shrink-0 gap-1.5 px-3 text-sm touch-manipulation"
    >
      {copied ? (
        <Check aria-hidden="true" className="size-4" />
      ) : (
        <Copy aria-hidden="true" className="size-4" />
      )}
      <span aria-live="polite">{copied ? "Copiado" : "Copiar"}</span>
    </Button>
  );
}
