"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const DISMISSED_KEY = "mi-edificio-install-dismissed";
const DISMISS_DAYS = 30;
const SHOW_DELAY_MS = 1500;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Platform = "ios" | "android" | "desktop" | "unknown";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

function wasRecentlyDismissed(): boolean {
  try {
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (!dismissed) return false;
    const dismissedAt = Number(dismissed);
    if (!Number.isFinite(dismissedAt)) return false;
    return Date.now() - dismissedAt < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone() || wasRecentlyDismissed()) return;
    const detected = detectPlatform();
    setPlatform(detected);

    if (detected === "ios") {
      const id = window.setTimeout(() => setShow(true), SHOW_DELAY_MS);
      return () => window.clearTimeout(id);
    }

    if (detected === "android") {
      const handler = (e: Event) => {
        e.preventDefault();
        setInstallEvent(e as BeforeInstallPromptEvent);
        setShow(true);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
  }, []);

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // localStorage might be unavailable (private mode, etc) — silently skip
    }
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") {
      dismiss();
    }
  }

  if (!show) return null;

  return (
    <Card className="border-l-4 border-l-primary animate-in fade-in slide-in-from-bottom-2 duration-300">
      <CardContent className="flex items-start gap-3 p-4">
        <div
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground"
        >
          <Download className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">
            Agregá Mi edificio a tu pantalla
          </p>
          {platform === "ios" ? (
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Tocá{" "}
              <Share
                aria-label="botón compartir de Safari"
                className="-mb-0.5 inline size-3.5"
              />{" "}
              abajo y elegí{" "}
              <span className="font-medium text-foreground">
                Agregar a inicio
              </span>
              .
            </p>
          ) : (
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Vas a tener acceso rápido sin abrir el navegador.
            </p>
          )}
          {platform === "android" && installEvent && (
            <Button
              type="button"
              size="sm"
              onClick={install}
              className="mt-3 h-9 px-3 text-xs touch-manipulation"
            >
              Instalar app
            </Button>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={dismiss}
          aria-label="No mostrar más"
          className="text-muted-foreground hover:text-foreground touch-manipulation"
        >
          <X aria-hidden="true" className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
