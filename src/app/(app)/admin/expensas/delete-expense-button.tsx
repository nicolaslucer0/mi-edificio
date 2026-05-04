"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { deleteExpense } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";

type Props = {
  expenseId: string;
  label: string;
};

export function DeleteExpenseButton({ expenseId, label }: Readonly<Props>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    if (
      !confirm(`¿Borrar la expensa de ${label}? Esta acción no se puede deshacer.`)
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteExpense(expenseId);
      if (result.ok) {
        toast.success("Expensa eliminada.");
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
