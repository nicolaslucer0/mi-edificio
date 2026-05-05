import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar — Mi edificio",
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3">
          <div
            aria-hidden="true"
            className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm"
          >
            <Building2 className="size-7" strokeWidth={2} />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Mi edificio
          </span>
        </div>

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
