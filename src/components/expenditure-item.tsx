import Link from "next/link";
import { FileText, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ExpenditureCategoryBadge } from "@/components/expenditure-category-badge";
import { DeleteExpenditureButton } from "@/components/delete-expenditure-button";
import { formatCurrencyCents, formatDate } from "@/lib/format";
import type { ExpenditureRow } from "@/lib/queries/expenditures";
import { cn } from "@/lib/utils";

export function ExpenditureItem({
  item,
  showAdminActions = false,
}: Readonly<{ item: ExpenditureRow; showAdminActions?: boolean }>) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-1 flex-col gap-1 min-w-0">
            <p className="text-base font-semibold leading-tight text-balance">
              {item.description}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDate(item.date)}
              {item.vendor && ` · ${item.vendor}`}
            </p>
          </div>
          <ExpenditureCategoryBadge category={item.category} />
        </div>

        <p className="text-2xl font-bold tabular-nums">
          {formatCurrencyCents(item.amountCents)}
        </p>

        {item.notes && (
          <p className="rounded-md bg-muted/50 p-3 text-sm leading-relaxed text-muted-foreground">
            {item.notes}
          </p>
        )}

        {(item.receiptUrl || showAdminActions) && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
            {item.receiptUrl ? (
              <a
                href={item.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-2 hover:underline touch-manipulation"
              >
                <FileText aria-hidden="true" className="size-4" />
                Ver comprobante
              </a>
            ) : (
              <span className="text-xs text-muted-foreground">
                Sin comprobante
              </span>
            )}

            {showAdminActions && (
              <div className="flex items-center gap-1">
                <Link
                  href={`/admin/gastos/${item.id}/editar`}
                  aria-label={`Editar gasto: ${item.description}`}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "icon-sm" }),
                    "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Pencil className="size-4" />
                </Link>
                <DeleteExpenditureButton
                  expenditureId={item.id}
                  description={item.description}
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
