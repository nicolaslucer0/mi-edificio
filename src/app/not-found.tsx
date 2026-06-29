import Link from "next/link";
import type { Metadata } from "next";
import { Home } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { BuildingScene } from "@/components/illustrations";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Página no encontrada — Mi edificio",
};

export default function NotFound() {
  return (
    <main className="auth-aurora flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <BuildingScene className="h-auto w-full max-w-56" />
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            404
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            No encontramos esta página
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground text-balance">
            Es posible que el link esté vencido o que ya no exista lo que
            estabas buscando.
          </p>
        </div>
        <Link
          href="/"
          className={cn(
            buttonVariants(),
            "h-12 gap-2 px-5 text-base touch-manipulation",
          )}
        >
          <Home aria-hidden="true" className="size-4" />
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
