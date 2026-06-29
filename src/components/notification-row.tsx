import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Receipt,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type NotificationView = {
  id: string;
  type:
    | "claim_to_validate"
    | "payment_confirmed"
    | "payment_rejected"
    | "new_expense";
  title: string;
  body: string | null;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
};

const ICON_BY_TYPE: Record<
  NotificationView["type"],
  { icon: LucideIcon; classes: string }
> = {
  claim_to_validate: { icon: Clock, classes: "bg-primary/10 text-primary" },
  payment_confirmed: {
    icon: CheckCircle2,
    classes: "bg-success/15 text-success",
  },
  payment_rejected: {
    icon: XCircle,
    classes: "bg-destructive/10 text-destructive",
  },
  new_expense: { icon: Receipt, classes: "bg-primary/10 text-primary" },
};

export function NotificationRow({
  item,
  onNavigate,
}: Readonly<{ item: NotificationView; onNavigate?: () => void }>) {
  const { icon: Icon, classes } = ICON_BY_TYPE[item.type];

  const content = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          classes,
        )}
      >
        <Icon className="size-4.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          {!item.readAt && (
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full bg-primary"
            />
          )}
          <span className="truncate text-sm font-semibold">{item.title}</span>
        </span>
        {item.body && (
          <span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground line-clamp-2">
            {item.body}
          </span>
        )}
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {formatRelativeTime(item.createdAt)}
        </span>
      </span>
    </>
  );

  const base = cn(
    "flex items-start gap-3 rounded-xl p-3 text-left",
    !item.readAt && "bg-primary/[0.04]",
  );

  if (item.href) {
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        className={cn(
          base,
          "transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation",
        )}
      >
        {content}
      </Link>
    );
  }
  return <div className={base}>{content}</div>;
}
