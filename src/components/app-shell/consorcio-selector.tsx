"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { Building2, Check, ChevronsUpDown, List, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { selectConsorcio } from "@/lib/actions/consorcio";
import { cn } from "@/lib/utils";

type ConsorcioOption = {
  id: string;
  name: string;
};

type Props = {
  options: ConsorcioOption[];
  currentId: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  variant?: "bar" | "sidebar";
};

export function ConsorcioSelector({
  options,
  currentId,
  isAdmin,
  isSuperAdmin,
  variant = "bar",
}: Readonly<Props>) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  if (options.length === 0) return null;

  // On /admin/<id>/… the URL is the source of truth for the active consorcio.
  const segments = pathname.split("/");
  const onAdminRoute = segments[1] === "admin";
  const adminRouteId =
    onAdminRoute && segments[2] && options.some((o) => o.id === segments[2])
      ? segments[2]
      : null;

  const effectiveId = adminRouteId ?? currentId ?? options[0].id;
  const current = options.find((o) => o.id === effectiveId) ?? options[0];

  const canSwitch = options.length > 1;
  const showFooter = isAdmin;

  function handleSelect(id: string) {
    if (id === current.id && !onAdminRoute) return;
    startTransition(async () => {
      await selectConsorcio(id);
      if (onAdminRoute) {
        router.push(`/admin/${id}`);
      } else {
        router.refresh();
      }
    });
  }

  // Nothing to switch to and no admin shortcuts: show a plain, non-interactive
  // label so it doesn't look like a button that does nothing.
  if (!canSwitch && !showFooter) {
    return <ConsorcioBadge name={current.name} variant={variant} />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Cambiar de consorcio"
        data-pending={isPending || undefined}
        className={cn(
          "group/swt inline-flex items-center gap-2 rounded-xl border border-border/50 bg-background text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation data-pending:opacity-60",
          variant === "sidebar"
            ? "w-full justify-between px-3 py-2"
            : "max-w-[min(58vw,18rem)] px-2.5 py-1.5",
        )}
      >
        <ConsorcioFace name={current.name} variant={variant} />
        <ChevronsUpDown
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-colors group-hover/swt:text-foreground"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="min-w-64 max-w-80"
      >
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt.id}
            onClick={() => handleSelect(opt.id)}
            className="cursor-pointer"
          >
            <Building2 aria-hidden="true" />
            <span className="flex-1 truncate">{opt.name}</span>
            {opt.id === current.id && (
              <Check aria-hidden="true" className="size-4" />
            )}
          </DropdownMenuItem>
        ))}
        {showFooter && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              render={
                <Link href="/admin" className="cursor-pointer">
                  <List aria-hidden="true" />
                  Ver todos los consorcios
                </Link>
              }
            />
            {isSuperAdmin && (
              <DropdownMenuItem
                render={
                  <Link href="/admin/consorcios" className="cursor-pointer">
                    <Plus aria-hidden="true" />
                    Crear consorcio
                  </Link>
                }
              />
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ConsorcioFace({
  name,
  variant,
}: Readonly<{ name: string; variant: "bar" | "sidebar" }>) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        aria-hidden="true"
        className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
      >
        <Building2 className="size-4" />
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        {variant === "sidebar" && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Consorcio
          </span>
        )}
        <span className="truncate text-sm font-semibold">{name}</span>
      </span>
    </span>
  );
}

function ConsorcioBadge({
  name,
  variant,
}: Readonly<{ name: string; variant: "bar" | "sidebar" }>) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border border-border/50 bg-background/60",
        variant === "sidebar"
          ? "w-full px-3 py-2"
          : "max-w-[min(58vw,18rem)] px-2.5 py-1.5",
      )}
    >
      <ConsorcioFace name={name} variant={variant} />
    </div>
  );
}
