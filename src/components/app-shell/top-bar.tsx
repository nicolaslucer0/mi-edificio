import Link from "next/link";
import { BrandMark } from "@/components/illustrations";
import { UserMenu } from "./user-menu";
import { ConsorcioSelector } from "./consorcio-selector";
import { NotificationsBell } from "./notifications-bell";
import type { NotificationView } from "@/components/notification-row";

type Props = {
  name: string | null;
  email: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  consorcios: Array<{ id: string; name: string }>;
  currentConsorcioId: string | null;
  notifications: NotificationView[];
  unreadCount: number;
};

export function TopBar({
  name,
  email,
  isAdmin,
  isSuperAdmin,
  consorcios,
  currentConsorcioId,
  notifications,
  unreadCount,
}: Readonly<Props>) {
  const hasConsorcios = consorcios.length > 0;

  return (
    <header
      data-print-hide
      className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/60 lg:hidden"
    >
      <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Link
            href="/"
            aria-label="Ir al inicio"
            className="inline-flex items-center gap-2 text-base font-semibold tracking-tight transition-opacity hover:opacity-80 touch-manipulation"
          >
            <BrandMark className="size-8 shrink-0" />
            {!hasConsorcios && <span>Mi edificio</span>}
          </Link>
          {hasConsorcios && (
            <ConsorcioSelector
              variant="bar"
              options={consorcios}
              currentId={currentConsorcioId}
              isAdmin={isAdmin}
              isSuperAdmin={isSuperAdmin}
            />
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <NotificationsBell
            unreadCount={unreadCount}
            items={notifications}
          />
          <UserMenu name={name} email={email} isAdmin={isAdmin} />
        </div>
      </div>
    </header>
  );
}
