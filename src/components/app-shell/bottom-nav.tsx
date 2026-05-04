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
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border/40 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70"
    >
      <ul className="mx-auto flex max-w-2xl items-stretch px-2 pb-[env(safe-area-inset-bottom)]">
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
                  "group/nav-item relative flex flex-col items-center justify-center gap-1 px-2 py-2.5 text-[11px] font-medium transition-colors touch-manipulation",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-3 top-0 h-[3px] rounded-b-full bg-primary animate-in fade-in slide-in-from-top-1 duration-300"
                  />
                )}
                <span
                  className={cn(
                    "flex size-10 items-center justify-center rounded-2xl transition-all duration-200",
                    active
                      ? "bg-primary/10 scale-100"
                      : "bg-transparent scale-95 group-hover/nav-item:bg-muted/60 group-active/nav-item:scale-90",
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    className={cn(
                      "transition-all duration-200",
                      active ? "size-5" : "size-[18px]",
                    )}
                  />
                </span>
                <span className="leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
