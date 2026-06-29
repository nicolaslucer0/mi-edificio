import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { EnvelopeScene } from "@/components/illustrations";

export const metadata: Metadata = {
  title: "Revisá tu email — Mi edificio",
};

export default function VerifyRequestPage() {
  return (
    <main className="auth-aurora flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-7">
        <EnvelopeScene className="h-auto w-full max-w-56" />

        <div className="flex flex-col gap-3 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            Revisá tu email
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground text-balance">
            Te enviamos un link para entrar. Tocá el botón que está adentro del
            mail y listo.
          </p>
        </div>

        <div className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-center text-sm leading-relaxed text-muted-foreground">
          ¿No lo ves? Fijate en{" "}
          <strong className="text-foreground">spam</strong> o esperá un par de
          minutos.
        </div>

        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground touch-manipulation"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Probar con otro email
        </Link>
      </div>
    </main>
  );
}
