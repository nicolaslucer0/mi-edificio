"use client";

import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AdminConsorcio, AdminUnit } from "@/lib/queries/admin";
import { AddMembershipForm } from "./add-membership-form";
import { cn } from "@/lib/utils";

type Props = {
  consorcios: AdminConsorcio[];
  units: AdminUnit[];
  /** Preselecciona la unidad: se usa desde una unidad sin nadie asignado. */
  unitId?: string;
  label?: string;
  variant?: "default" | "ghost";
  className?: string;
};

/**
 * Abre el alta de vecino en un diálogo. El formulario dejó de estar siempre a
 * la vista para que la primera pantalla sea la lista.
 */
export function NewVecinoButton({
  consorcios,
  units,
  unitId,
  label = "Nuevo vecino",
  variant = "default",
  className,
}: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  if (consorcios.length === 0) return null;

  return (
    <>
      <Button
        type="button"
        variant={variant}
        onClick={() => setOpen(true)}
        className={cn("touch-manipulation", className)}
      >
        <Plus aria-hidden="true" className="size-4" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="gap-2">
            <DialogTitle className="text-lg">Agregar vecino</DialogTitle>
            <DialogDescription className="leading-relaxed">
              Si el email ya existe, se le suma la asignación. Si no, queda
              habilitado para entrar con su email.
            </DialogDescription>
          </DialogHeader>
          <AddMembershipForm
            consorcios={consorcios}
            units={units}
            defaultUnitId={unitId}
            onDone={close}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
