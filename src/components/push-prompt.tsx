"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePushSubscription } from "@/components/push-toggle";
import { cn } from "@/lib/utils";

const DISMISSED_KEY = "mi-edificio-push-prompt-dismissed";
const DISMISS_DAYS = 30;

function wasRecentlyDismissed(): boolean {
  try {
    const dismissed = Number(localStorage.getItem(DISMISSED_KEY));
    return (
      Number.isFinite(dismissed) &&
      dismissed > 0 &&
      Date.now() - dismissed < DISMISS_DAYS * 86_400_000
    );
  } catch {
    return false;
  }
}

/**
 * "Recibí los avisos en el teléfono", en el inicio. El inicio promete "te
 * avisamos cuando llegue la próxima", pero el botón para activarlo estaba al
 * fondo de Más → Mi cuenta, y los recordatorios no sirven si no llegan.
 *
 * Es un botón y no un pedido automático de permiso, como pide
 * docs/notificaciones-push.md. Solo aparece si en este dispositivo se puede
 * activar y todavía no está activo; en iPhone sin instalar, de eso se ocupa
 * la tarjeta de instalar la app.
 */
export function PushPrompt({ className }: Readonly<{ className?: string }>) {
  const { status, pending, activate } = usePushSubscription();
  // Oculta hasta leer el localStorage, para que no aparezca y desaparezca.
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setDismissed(wasRecentlyDismissed());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status !== "off" || dismissed) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // Sin localStorage, se oculta solo por esta vez.
    }
    setDismissed(true);
  }

  return (
    <Card
      className={cn(
        "border-l-4 border-l-primary animate-in fade-in slide-in-from-bottom-2 duration-300",
        className,
      )}
    >
      <CardContent className="flex items-start gap-3 p-4">
        <div
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground"
        >
          <Bell className="size-5" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-base font-semibold leading-tight">
              Recibí los avisos en el teléfono
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Te avisamos cuando llega una expensa, cuando vence y cuando se
              confirma tu pago.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={activate}
              disabled={pending}
              className="h-12 px-5 text-base touch-manipulation"
            >
              {pending ? "Un momento…" : "Activar avisos"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={dismiss}
              disabled={pending}
              className="h-12 px-4 text-base text-muted-foreground touch-manipulation"
            >
              Ahora no
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
