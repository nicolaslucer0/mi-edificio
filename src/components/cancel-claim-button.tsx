"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cancelClaim } from "@/lib/actions/expensas";

/** "Me equivoqué": borra un aviso de pago propio que todavía no se validó. */
export function CancelClaimButton({ claimId }: Readonly<{ claimId: string }>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (
      !confirm(
        "¿Borrar este aviso de pago? El administrador ya no lo va a ver, y la expensa vuelve a figurar sin pagar.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await cancelClaim(claimId);
      if (result.ok) {
        toast.success("Listo, borramos el aviso.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={handleClick}
      disabled={pending}
      className="h-11 px-3 text-sm text-muted-foreground touch-manipulation hover:text-foreground"
    >
      {pending ? "Borrando…" : "Me equivoqué, borrar este aviso"}
    </Button>
  );
}
