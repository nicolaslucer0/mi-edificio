"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronRight, Plus, Receipt, Wallet } from "lucide-react";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

type Props = {
  /** Fallback consorcio to act on when not inside an /admin/<id> route. */
  consorcioId: string | null;
};

export function ActionFab({ consorcioId }: Readonly<Props>) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // On /admin/<id>/… the URL consorcio wins over the cookie-selected one.
  const segments = pathname.split("/");
  const onAdminRoute = segments[1] === "admin";
  const adminRouteId =
    onAdminRoute && segments[2] && segments[2] !== "consorcios"
      ? segments[2]
      : null;
  const targetId = adminRouteId ?? consorcioId;

  // Hide on form pages so it never covers the form's own actions.
  const onFormRoute =
    pathname.includes("/nueva") || pathname.includes("/editar");

  if (!targetId || onFormRoute) return null;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger
        aria-label="Agregar expensa o gasto"
        data-print-hide
        className="fixed right-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background touch-manipulation lg:right-8 lg:bottom-8"
      >
        <Plus aria-hidden="true" className="size-7" strokeWidth={2.4} />
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Agregar</DrawerTitle>
          <DrawerDescription>
            Elegí qué querés cargar para el consorcio.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="gap-3 pt-1">
          <ActionRow
            href={`/admin/${targetId}/expensas/nueva`}
            title="Nueva expensa"
            description="Cobrar a una unidad o a todo el consorcio."
            icon={<Wallet aria-hidden="true" className="size-5" />}
            onNavigate={() => setOpen(false)}
          />
          <ActionRow
            href={`/admin/${targetId}/gastos/nueva`}
            title="Nuevo gasto"
            description="Registrar un gasto del consorcio con comprobante."
            icon={<Receipt aria-hidden="true" className="size-5" />}
            onNavigate={() => setOpen(false)}
          />
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

function ActionRow({
  href,
  title,
  description,
  icon,
  onNavigate,
}: Readonly<{
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  onNavigate: () => void;
}>) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="group/action flex items-center gap-3 rounded-2xl border border-border/50 bg-background p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation"
    >
      <span
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold leading-tight">
          {title}
        </span>
        <span className="block text-sm leading-relaxed text-muted-foreground">
          {description}
        </span>
      </span>
      <ChevronRight
        aria-hidden="true"
        className="size-5 shrink-0 text-muted-foreground"
      />
    </Link>
  );
}
