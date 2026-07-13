"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cancelReservation } from "@/lib/actions/amenities";

export function CancelReservationButton({
  reservationId,
  label = "Cancelar",
}: Readonly<{ reservationId: string; label?: string }>) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelReservation(reservationId);
      if (result.ok) {
        toast.success("Reserva cancelada.");
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
      onClick={handleCancel}
      disabled={pending}
      className="h-9 px-3 text-sm text-destructive hover:text-destructive touch-manipulation"
    >
      {pending ? "Cancelando…" : label}
    </Button>
  );
}
