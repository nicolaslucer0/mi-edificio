"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Home, Receipt, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  isActive: (pathname: string) => boolean;
};

const ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Inicio",
    icon: Home,
    isActive: (p) => p === "/",
  },
  {
    href: "/expensas",
    label: "Expensas",
    icon: Wallet,
    isActive: (p) => p.startsWith("/expensas"),
  },
  {
    href: "/gastos",
    label: "Gastos",
    icon: Receipt,
    isActive: (p) => p.startsWith("/gastos"),
  },
  {
    href: "/balance",
    label: "Balance",
    icon: BarChart3,
    isActive: (p) => p.startsWith("/balance"),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border/40 bg-background/85 backdrop-blur-md supports-backdrop-filter:bg-background/70"
    >
      <ul className="mx-auto flex max-w-2xl items-stretch px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {ITEMS.map((item) => {
          const active = item.isActive(pathname);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={cn(
                  "group/nav-item flex flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-1.5 text-[11px] font-medium touch-manipulation transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "relative flex h-9 w-12 items-center justify-center rounded-2xl transition-all duration-300 ease-out",
                    active
                      ? "bg-foreground text-background scale-100 shadow-sm"
                      : "bg-transparent scale-95 group-hover/nav-item:bg-muted group-active/nav-item:scale-90",
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    className="size-4.5 transition-all duration-300"
                    strokeWidth={active ? 2.4 : 2}
                  />
                </span>
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
  );
}
