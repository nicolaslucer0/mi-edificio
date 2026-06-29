import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Tone = "violet" | "blue" | "green" | "amber" | "coral" | "teal";

// Clases completas (no interpolar): Tailwind necesita verlas literales.
const TONE_CLASSES: Record<Tone, string> = {
  violet: "from-spot-violet-soft text-spot-violet ring-spot-violet/15",
  blue: "from-spot-blue-soft text-spot-blue ring-spot-blue/15",
  green: "from-spot-green-soft text-spot-green ring-spot-green/15",
  amber: "from-spot-amber-soft text-spot-amber ring-spot-amber/15",
  coral: "from-spot-coral-soft text-spot-coral ring-spot-coral/15",
  teal: "from-spot-teal-soft text-spot-teal ring-spot-teal/15",
};

type Props = {
  icon: LucideIcon;
  title: string;
  description?: string;
  tone?: Tone;
  action?: {
    href: string;
    label: string;
  };
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  tone = "violet",
  action,
}: Readonly<Props>) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 px-6 py-10 text-center">
        <div
          aria-hidden="true"
          className={cn(
            "flex size-16 items-center justify-center rounded-3xl bg-linear-to-b to-card ring-1 ring-inset",
            TONE_CLASSES[tone],
          )}
        >
          <Icon className="size-7" strokeWidth={1.75} />
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
