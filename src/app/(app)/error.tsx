"use client";

import { useEffect, useTransition } from "react";
import Link from "next/link";
import { Home, RotateCcw, TriangleAlert } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Pantalla de error de la app.
 *
 * Sin este archivo, cualquier excepción del servidor —una consulta que falla,
 * un server action que revienta— se lleva la página entera al error genérico de
 * Next, que en producción es una pantalla blanca con una línea en inglés. Para
 * quien usa la app eso no se distingue de "la app está rota".
 *
 * Queda en `(app)` y no en la raíz a propósito: `error.tsx` NO envuelve al
 * layout de su propio segmento, así que la barra de navegación y el header
 * siguen ahí y el error se ve adentro de la app, con salida a cualquier
 * pantalla. Si lo que falla es el layout mismo, el error sube al boundary de
 * arriba (hoy, el default de Next).
 *
 * No reporta a Sentry desde acá: los errores no manejados los captura
 * `onRequestError` en `instrumentation.ts`, del lado del servidor, y el SDK del
 * navegador está afuera del bundle a propósito (ver `next.config.ts`).
 */
export default function AppError({
  error,
  unstable_retry,
}: Readonly<{
  error: Error & { digest?: string };
  // El nombre lo define Next 16. `reset()` re-renderiza sin volver a pedir los
  // datos, que para un error de carga deja la misma pantalla fallada.
  unstable_retry: () => void;
}>) {
  const [isRetrying, startRetry] = useTransition();

  useEffect(() => {
    console.error("error de pantalla", error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <div
              aria-hidden="true"
              className="flex size-16 items-center justify-center rounded-3xl bg-linear-to-b from-spot-coral-soft to-card text-spot-coral ring-1 ring-inset ring-spot-coral/15"
            >
              <TriangleAlert className="size-7" strokeWidth={1.75} />
            </div>

            <div role="alert" className="flex flex-col gap-1.5">
              <h1 className="text-xl font-semibold text-foreground text-balance">
                Algo se rompió de nuestro lado
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground text-balance">
                No pudimos terminar lo que estabas haciendo. No hiciste nada mal
                y no se borró nada: probá de nuevo.
              </p>
            </div>

            <div className="mt-2 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button
                onClick={() => startRetry(() => unstable_retry())}
                disabled={isRetrying}
                className="h-12 gap-2 px-5 text-base touch-manipulation"
              >
                <RotateCcw aria-hidden="true" className="size-4" />
                {isRetrying ? "Probando…" : "Probar de nuevo"}
              </Button>
              <Link
                href="/"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-12 gap-2 px-5 text-base touch-manipulation",
                )}
              >
                <Home aria-hidden="true" className="size-4" />
                Volver al inicio
              </Link>
            </div>

            {error.digest && (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Si vuelve a pasar, pasá este código:{" "}
                <span className="font-mono select-all">{error.digest}</span>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
