import type { Metadata } from "next";
import { Mail } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Revisá tu email — Mi edificio",
};

export default function VerifyRequestPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center gap-4 text-center">
          <div
            aria-hidden="true"
            className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary"
          >
            <Mail className="size-8" />
          </div>
          <CardTitle className="text-3xl font-semibold tracking-tight text-balance">
            Revisá tu email
          </CardTitle>
          <CardDescription className="text-base leading-relaxed">
            Te enviamos un link para entrar. Hacé clic en el botón que está
            adentro del mail y listo.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground leading-relaxed">
          <p>
            Si no lo ves, fijate en la carpeta de <strong>spam</strong> o{" "}
            <strong>correo no deseado</strong>.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
