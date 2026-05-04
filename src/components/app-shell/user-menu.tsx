"use client";

import Link from "next/link";
import { LogOut, ShieldCheck } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/lib/actions/auth";

type Props = {
  name: string | null;
  email: string;
  isAdmin: boolean;
};

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts.at(-1)![0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function UserMenu({ name, email, isAdmin }: Readonly<Props>) {
  const initials = getInitials(name, email);
  const display = name ?? email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Abrir menú de usuario"
        className="rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background touch-manipulation"
      >
        <Avatar size="default">
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="min-w-56">
        <div className="flex flex-col gap-0.5 px-2 pt-2 pb-1">
          <p className="text-sm font-medium text-foreground truncate">
            {display}
          </p>
          {name && (
            <p className="text-xs text-muted-foreground truncate">{email}</p>
          )}
        </div>
        <DropdownMenuSeparator />
        {isAdmin && (
          <>
            <DropdownMenuItem
              render={
                <Link href="/admin" className="cursor-pointer">
                  <ShieldCheck aria-hidden="true" />
                  Panel admin
                </Link>
              }
            />
            <DropdownMenuSeparator />
          </>
        )}
        <form action={signOutAction}>
          <DropdownMenuItem
            variant="destructive"
            nativeButton
            render={
              <button type="submit" className="w-full cursor-pointer">
                <LogOut aria-hidden="true" />
                Cerrar sesión
              </button>
            }
          />
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
