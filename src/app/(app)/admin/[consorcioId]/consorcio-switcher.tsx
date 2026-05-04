"use client";

import Link from "next/link";
import { Building2, Check, ChevronsUpDown, List, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ConsorcioOption = {
  id: string;
  name: string;
};

type Props = {
  current: ConsorcioOption;
  options: ConsorcioOption[];
  isSuperAdmin: boolean;
};

export function ConsorcioSwitcher({
  current,
  options,
  isSuperAdmin,
}: Readonly<Props>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Cambiar de consorcio"
        className="group/swt inline-flex w-full items-center justify-between gap-2 rounded-xl border border-border/50 bg-background px-3 py-2 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation sm:w-auto"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <Building2 className="size-4" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Consorcio
            </span>
            <span className="truncate text-sm font-semibold">
              {current.name}
            </span>
          </span>
        </span>
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
            render={
              <Link href={`/admin/${opt.id}`} className="cursor-pointer">
                <Building2 aria-hidden="true" />
                <span className="flex-1 truncate">{opt.name}</span>
                {opt.id === current.id && (
                  <Check aria-hidden="true" className="size-4" />
                )}
              </Link>
            }
          />
        ))}
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
