"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { deleteExpense } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { formatCurrencyCents } from "@/lib/format";

type Props = {
  expenseId: string;
  label: string;
  paidCents: number;
};

export function DeleteExpenseButton({
  expenseId,
  label,
  paidCents,
}: Readonly<Props>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    const paidNote =
      paidCents > 0
        ? ` Ya se pagaron ${formatCurrencyCents(paidCents)}: pasan a saldo a favor de la unidad.`
        : "";
    if (
      !confirm(
        `¿Borrar la expensa de ${label}?${paidNote} Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteExpense(expenseId);
      if (result.ok) {
        toast.success(
          paidCents > 0
            ? "Expensa eliminada. Lo pagado pasó a saldo a favor."
            : "Expensa eliminada.",
        );
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={onClick}
      disabled={pending}
      aria-label={`Borrar expensa: ${label}`}
      className="text-muted-foreground hover:text-destructive touch-manipulation"
    >
      <Trash2 aria-hidden="true" className="size-4" />
    </Button>
  );
}
