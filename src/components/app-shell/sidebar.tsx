"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/illustrations";
import { UserMenu } from "./user-menu";
import { ConsorcioSelector } from "./consorcio-selector";
import { NotificationsBell } from "./notifications-bell";
import { ThemeToggle } from "./theme-toggle";
import { getNavItems, navDirection } from "./nav-items";
import type { NotificationView } from "@/components/notification-row";

type Props = {
  name: string | null;
  email: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  hasAmenities: boolean;
  /** A dónde va "Admin". Ver `getNavItems`. */
  adminHref?: string;
  consorcios: Array<{ id: string; name: string }>;
  currentConsorcioId: string | null;
  notifications: NotificationView[];
  unreadCount: number;
};

export function Sidebar({
  name,
  email,
  isAdmin,
  isSuperAdmin,
  hasAmenities,
  adminHref,
  consorcios,
  currentConsorcioId,
  notifications,
  unreadCount,
}: Readonly<Props>) {
  const pathname = usePathname();
  const items = getNavItems(isAdmin, hasAmenities, adminHref);
  const currentIndex = items.findIndex((item) => item.isActive(pathname));
  const display = name ?? email;

  return (
    <aside
      aria-label="Navegación principal"
      data-print-hide
      className="vt-sidebar hidden lg:flex sticky top-0 h-screen w-64 shrink-0 flex-col border-r border-border/50 bg-background/85 backdrop-blur-md supports-backdrop-filter:bg-background/70"
    >
      <Link
        href="/"
        className="flex items-center gap-2 px-5 py-5 text-base font-semibold tracking-tight transition-opacity hover:opacity-80"
      >
        <BrandMark className="size-8 shrink-0" />
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
          {items.map((item, index) => {
            const active = item.isActive(pathname);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  transitionTypes={navDirection(currentIndex, index)}
                  className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <SidebarItemVisual
                    Icon={Icon}
                    label={item.label}
                    active={active}
                  />
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
        {/* En desktop la top bar no se muestra: el cambio de tema vive acá. */}
        <ThemeToggle />
        <NotificationsBell unreadCount={unreadCount} items={notifications} />
      </div>
    </aside>
  );
}

/** Se pinta como activo apenas lo tocás (ver BottomNav para el porqué). */
function SidebarItemVisual({
  Icon,
  label,
  active,
}: Readonly<{ Icon: LucideIcon; label: string; active: boolean }>) {
  const { pending } = useLinkStatus();
  const highlighted = active || pending;

  return (
    <span
      className={cn(
        "group/nav-item flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        highlighted
          ? "bg-foreground text-background shadow-sm"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <span role="status" className="sr-only">
        {pending ? `Cargando ${label}…` : ""}
      </span>
      <Icon
        aria-hidden="true"
        className="size-4.5 shrink-0"
        strokeWidth={highlighted ? 2.4 : 2}
      />
      <span
        className={cn(
          "leading-none transition-all",
          highlighted ? "font-semibold" : "font-medium",
        )}
      >
        {label}
      </span>
    </span>
  );
}
