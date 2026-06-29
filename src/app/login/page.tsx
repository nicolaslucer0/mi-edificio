import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { BrandMark, BuildingScene } from "@/components/illustrations";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar — Mi edificio",
};

export default function LoginPage() {
  return (
    <main className="auth-aurora flex flex-1 flex-col justify-center lg:flex-row lg:justify-normal">
      {/* Panel marca + ilustración. En desktop ocupa la mitad izquierda;
          en mobile va arriba y luego apila el formulario. */}
      <section className="flex flex-col items-center justify-center gap-5 px-6 pt-10 lg:flex-1 lg:gap-6 lg:px-10 lg:py-12">
        <div className="flex flex-col items-center gap-3">
          <BrandMark className="size-14 drop-shadow-sm" />
          <span className="text-lg font-semibold tracking-tight">
            Mi edificio
          </span>
        </div>
        <BuildingScene className="h-auto w-full max-w-60 lg:max-w-sm" />
      </section>

      {/* Panel del formulario. Centrado vertical en su mitad. */}
      <section className="flex flex-col items-center justify-center gap-6 px-6 pt-6 pb-10 lg:flex-1 lg:px-10 lg:py-12">
        <div className="flex w-full max-w-md flex-col gap-3 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            Hola, vecino
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground text-balance">
            Ingresá tu email y te mandamos un link para entrar.{" "}
            <span className="font-medium text-foreground">Sin contraseña.</span>
          </p>
        </div>

        <Card className="w-full max-w-md">
          <CardContent className="p-5 sm:p-6">
            <LoginForm />
          </CardContent>
        </Card>

        <p className="max-w-md px-4 text-center text-xs leading-relaxed text-muted-foreground">
          Si tu email no está cargado, pedile al admin de tu consorcio que te
          agregue.
        </p>
      </section>
    </main>
  );
}
