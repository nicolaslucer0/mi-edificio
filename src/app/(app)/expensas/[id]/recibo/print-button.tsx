"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button
      type="button"
      onClick={() => window.print()}
      className="h-12 w-full text-base touch-manipulation sm:w-auto"
    >
      <Printer aria-hidden="true" className="size-4" />
      Descargar o imprimir
    </Button>
  );
}
