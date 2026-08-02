"use client";

import * as React from "react";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";

/**
 * Un panel que es bottom sheet en el teléfono y modal en pantalla grande.
 *
 * La API es la misma que la del Drawer, así que las pantallas se pasan
 * cambiando el import y el prefijo. Cada pieza pregunta por el contexto en vez
 * de que el llamador tenga que escribir la bifurcación.
 */
const DesktopContext = React.createContext(false);

const DESKTOP_QUERY = "(min-width: 640px)";

function useIsDesktop(): boolean {
  return React.useContext(DesktopContext);
}

export function ResponsiveDialog({
  open,
  onOpenChange,
  children,
}: Readonly<{
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}>) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const Root = isDesktop ? Dialog : Drawer;
  return (
    <DesktopContext.Provider value={isDesktop}>
      <Root open={open} onOpenChange={onOpenChange}>
        {children}
      </Root>
    </DesktopContext.Provider>
  );
}

export function ResponsiveDialogTrigger({
  children,
  ...props
}: React.ComponentProps<typeof DrawerTrigger>) {
  const Trigger = useIsDesktop() ? DialogTrigger : DrawerTrigger;
  return <Trigger {...props}>{children}</Trigger>;
}

export function ResponsiveDialogContent({
  className,
  children,
}: Readonly<{ className?: string; children: React.ReactNode }>) {
  const isDesktop = useIsDesktop();
  if (isDesktop) {
    return (
      // El grid del Dialog pasa a columna flex para que el cuerpo scrollee y
      // el header y el footer queden fijos, igual que en el drawer.
      <DialogContent
        className={cn(
          "flex max-h-[85vh] flex-col sm:max-w-lg",
          className,
        )}
      >
        {children}
      </DialogContent>
    );
  }
  return <DrawerContent className={className}>{children}</DrawerContent>;
}

export function ResponsiveDialogHeader({
  className,
  children,
}: Readonly<{ className?: string; children: React.ReactNode }>) {
  const Header = useIsDesktop() ? DialogHeader : DrawerHeader;
  return <Header className={className}>{children}</Header>;
}

export function ResponsiveDialogTitle({
  className,
  children,
}: Readonly<{ className?: string; children: React.ReactNode }>) {
  const isDesktop = useIsDesktop();
  if (isDesktop) {
    return (
      <DialogTitle className={cn("text-lg", className)}>{children}</DialogTitle>
    );
  }
  return <DrawerTitle className={className}>{children}</DrawerTitle>;
}

export function ResponsiveDialogDescription({
  className,
  children,
}: Readonly<{ className?: string; children: React.ReactNode }>) {
  const isDesktop = useIsDesktop();
  if (isDesktop) {
    return (
      <DialogDescription className={cn("leading-relaxed", className)}>
        {children}
      </DialogDescription>
    );
  }
  return <DrawerDescription className={className}>{children}</DrawerDescription>;
}

export function ResponsiveDialogBody({
  className,
  children,
}: Readonly<{ className?: string; children: React.ReactNode }>) {
  const isDesktop = useIsDesktop();
  if (isDesktop) {
    // min-h-0: sin eso un hijo flex no achica por debajo de su contenido y el
    // max-h del modal se desborda en vez de scrollear.
    return (
      <div
        className={cn("flex min-h-0 flex-col gap-4 overflow-y-auto", className)}
      >
        {children}
      </div>
    );
  }
  return <DrawerBody className={className}>{children}</DrawerBody>;
}

/**
 * La acción principal va primero, como en el drawer. En el modal se invierte la
 * fila para que quede a la derecha, que es donde se la busca en desktop.
 */
export function ResponsiveDialogFooter({
  className,
  children,
}: Readonly<{ className?: string; children: React.ReactNode }>) {
  const isDesktop = useIsDesktop();
  if (isDesktop) {
    return (
      <DialogFooter
        className={cn("sm:flex-row-reverse sm:justify-start", className)}
      >
        {children}
      </DialogFooter>
    );
  }
  return <DrawerFooter className={className}>{children}</DrawerFooter>;
}
