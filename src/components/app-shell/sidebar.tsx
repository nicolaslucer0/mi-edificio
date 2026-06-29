"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu } from "./user-menu";
import { ConsorcioSelector } from "./consorcio-selector";
import { getNavItems } from "./nav-items";

type Props = {
  name: string | null;
  email: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  consorcios: Array<{ id: string; name: string }>;
  currentConsorcioId: string | null;
};

export function Sidebar({
  name,
  email,
  isAdmin,
  isSuperAdmin,
  consorcios,
  currentConsorcioId,
}: Readonly<Props>) {
  const pathname = usePathname();
  const items = getNavItems(isAdmin);
  const display = name ?? email;

  return (
    <aside
      aria-label="Navegación principal"
      data-print-hide
      className="hidden lg:flex sticky top-0 h-screen w-64 shrink-0 flex-col border-r border-border/50 bg-background/85 backdrop-blur-md supports-backdrop-filter:bg-background/70"
    >
      <Link
        href="/"
        className="flex items-center gap-2 px-5 py-5 text-base font-semibold tracking-tight transition-opacity hover:opacity-80"
      >
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary"
        >
          <Building2 className="size-4" />
        </span>
        <span>Mi edificio</span>
      </Link>

      {consorcios.length > 0 && (
        <div className="px-3 pb-3">
          <ConsorcioSelector
            variant="sidebar"
            options={consorcios}
            currentId={currentConsorcioId}
            isAdmin={isAdmin}
            isSuperAdmin={isSuperAdmin}
          />
        </div>
      )}

      <nav className="flex-1 px-3">
        <ul className="flex flex-col gap-1">
          {items.map((item) => {
            const active = item.isActive(pathname);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group/nav-item flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    className="size-4.5 shrink-0"
                    strokeWidth={active ? 2.4 : 2}
                  />
                  <span
                    className={cn(
                      "leading-none transition-all",
                      active ? "font-semibold" : "font-medium",
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex items-center gap-3 border-t border-border/50 px-4 py-4">
        <UserMenu name={name} email={email} isAdmin={isAdmin} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight">
            {display}
          </p>
          {name && (
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          )}
        </div>
      </div>
    </aside>
  );
}
