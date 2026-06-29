import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { BrandMark, BuildingScene } from "@/components/illustrations";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar — Mi edificio",
};

export default function LoginPage() {
  return (
    <main className="auth-aurora flex flex-1 flex-col items-center justify-center px-6 py-10">
      <div className="flex w-full max-w-md flex-col items-center gap-7">
        <div className="flex flex-col items-center gap-3">
          <BrandMark className="size-14 drop-shadow-sm" />
          <span className="text-lg font-semibold tracking-tight">
            Mi edificio
          </span>
        </div>

        <BuildingScene className="h-auto w-full max-w-xs" />

        <div className="flex w-full flex-col gap-3 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            Hola, vecino
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground text-balance">
            Ingresá tu email y te mandamos un link para entrar.{" "}
            <span className="font-medium text-foreground">Sin contraseña.</span>
          </p>
        </div>

        <Card className="w-full">
          <CardContent className="p-5 sm:p-6">
            <LoginForm />
          </CardContent>
        </Card>

        <p className="px-4 text-center text-xs leading-relaxed text-muted-foreground">
          Si tu email no está cargado, pedile al admin de tu consorcio que te
          agregue.
        </p>
      </div>
    </main>
  );
}
