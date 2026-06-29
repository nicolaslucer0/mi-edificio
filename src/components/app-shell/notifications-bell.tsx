"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  NotificationRow,
  type NotificationView,
} from "@/components/notification-row";
import { markAllNotificationsRead } from "@/lib/actions/notifications";

type Props = {
  unreadCount: number;
  items: NotificationView[];
};

export function NotificationsBell({ unreadCount, items }: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && unreadCount > 0) {
      startTransition(async () => {
        await markAllNotificationsRead();
        router.refresh();
      });
    }
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerTrigger
        aria-label={
          unreadCount > 0
            ? `Novedades (${unreadCount} sin leer)`
            : "Novedades"
        }
        className="relative inline-flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation"
      >
        <Bell aria-hidden="true" className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Novedades</DrawerTitle>
        </DrawerHeader>
        <DrawerBody className="gap-1">
          {items.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No tenés novedades todavía.
            </p>
          ) : (
            <>
              {items.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  onNavigate={() => setOpen(false)}
                />
              ))}
              <Link
                href="/novedades"
                onClick={() => setOpen(false)}
                className="mt-1 rounded-xl py-2.5 text-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground touch-manipulation"
              >
                Ver todas
              </Link>
            </>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
