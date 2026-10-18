"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Share, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { subscribeToPush, unsubscribeFromPush } from "@/lib/actions/push";
import { Button } from "@/components/ui/button";

/**
 * - `checking`: todavía no sabemos (primera pintura y consulta al navegador).
 * - `unsupported`: el navegador no tiene push.
 * - `needs-install`: iOS sin la app agregada a inicio. Ahí no existe el push.
 * - `denied`: el permiso está bloqueado; desde la página ya no se puede pedir.
 * - `off` / `on`: se puede activar o desactivar.
 */
type Status =
  | "checking"
  | "unsupported"
  | "needs-install"
  | "denied"
  | "off"
  | "on";

/** La clave VAPID viaja en base64url y el navegador la quiere en bytes. */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function isStandalone(): boolean {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

function isIos(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

/**
 * El estado del push en este dispositivo y cómo activarlo o desactivarlo. Lo
 * usan el botón de Mi cuenta y la tarjeta del inicio.
 */
export function usePushSubscription() {
  const [status, setStatus] = useState<Status>("checking");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Todo el chequeo vive adentro de la promesa: nada de leer el navegador
    // durante el render (rompería la hidratación, el servidor no lo tiene) ni
    // de llamar a setStatus sincrónicamente desde el efecto.
    const resolveStatus = async (): Promise<Status> => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        // En iOS el push existe solo con la app agregada a inicio, así que la
        // ausencia se explica distinto según el caso.
        return isIos() && !isStandalone() ? "needs-install" : "unsupported";
      }
      if (Notification.permission === "denied") return "denied";
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        return subscription ? "on" : "off";
      } catch {
        return "off";
      }
    };

    resolveStatus().then((next) => {
      if (!cancelled) setStatus(next);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function activate() {
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!key) {
      toast.error("Los avisos todavía no están configurados en el servidor.");
      return;
    }

    setPending(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });

      const json = subscription.toJSON();
      const result = await subscribeToPush({
        endpoint: subscription.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      });

      if (!result.ok) {
        toast.error(result.error);
        await subscription.unsubscribe();
        return;
      }

      setStatus("on");
      toast.success("Avisos activados en este dispositivo.");
    } catch {
      toast.error("No pudimos activar los avisos. Probá de nuevo.");
    } finally {
      setPending(false);
    }
  }

  async function deactivate() {
    setPending(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unsubscribeFromPush(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("off");
      toast.success("Ya no vas a recibir avisos en este dispositivo.");
    } catch {
      toast.error("No pudimos desactivar los avisos. Probá de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return { status, pending, activate, deactivate };
}

export function PushToggle() {
  const { status, pending, activate, deactivate } = usePushSubscription();

  if (status === "checking") {
    return <p className="text-sm text-muted-foreground">Verificando…</p>;
  }

  if (status === "needs-install") {
    return (
      <Message icon={Share}>
        Para recibir avisos en el iPhone, primero agregá Mi edificio a tu
        pantalla de inicio: tocá el botón de compartir y elegí{" "}
        <span className="font-medium text-foreground">Agregar a inicio</span>.
        Después volvé acá.
      </Message>
    );
  }

  if (status === "unsupported") {
    return (
      <Message icon={TriangleAlert}>
        Este navegador no puede recibir avisos. Probá desde Chrome en Android o
        agregando la app a la pantalla de inicio en el iPhone.
      </Message>
    );
  }

  if (status === "denied") {
    return (
      <Message icon={BellOff}>
        Bloqueaste los avisos para este sitio, así que no los podemos pedir de
        nuevo desde acá. Se habilitan en la configuración del navegador, en los
        permisos de notificaciones.
      </Message>
    );
  }

  const on = status === "on";
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-muted-foreground">
        {on
          ? "Este dispositivo recibe los avisos del consorcio."
          : "Activalos para enterarte de las expensas nuevas y de tus pagos sin depender del mail."}
      </p>
      <Button
        type="button"
        variant={on ? "outline" : "default"}
        disabled={pending}
        onClick={on ? deactivate : activate}
        className="h-12 self-start px-5 text-base touch-manipulation"
      >
        {on ? (
          <BellOff aria-hidden="true" className="size-4" />
        ) : (
          <Bell aria-hidden="true" className="size-4" />
        )}
        {(() => {
          if (pending) return "Un momento…";
          return on ? "Desactivar en este dispositivo" : "Activar avisos";
        })()}
      </Button>
    </div>
  );
}

function Message({
  icon: Icon,
  children,
}: Readonly<{ icon: typeof Bell; children: React.ReactNode }>) {
  return (
    <p className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground">
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
