import Link from "next/link";
import { Bell, ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getRecentNotifications } from "@/lib/notifications";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { NotificationRow } from "@/components/notification-row";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Novedades — Mi edificio",
};

export default async function NovedadesPage() {
  const user = await requireUser();
  const items = await getRecentNotifications(user.id, 50);

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="Volver al inicio"
            className={cn(
              buttonVariants({ variant: "outline", size: "icon-lg" }),
              "touch-manipulation",
            )}
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            Novedades
          </h1>
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Sin novedades todavía"
            description="Acá vas a ver los avisos de pagos, expensas nuevas y validaciones."
          />
        ) : (
          <ul className="flex flex-col gap-1">
            {items.map((item) => (
              <li key={item.id}>
                <NotificationRow item={item} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
