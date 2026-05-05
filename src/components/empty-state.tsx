import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    href: string;
    label: string;
  };
};

export function EmptyState({ icon: Icon, title, description, action }: Readonly<Props>) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 px-6 py-10 text-center">
        <div
          aria-hidden="true"
          className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground"
        >
          <Icon className="size-6" />
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-base font-semibold text-foreground text-balance">
            {title}
          </p>
          {description && (
            <p className="text-sm leading-relaxed text-muted-foreground text-balance">
              {description}
            </p>
          )}
        </div>
        {action && (
          <Link
            href={action.href}
            className={cn(
              buttonVariants(),
              "mt-2 h-11 px-5 text-sm touch-manipulation",
            )}
          >
            {action.label}
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
