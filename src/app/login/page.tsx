import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar — Mi edificio",
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="gap-3 text-center">
          <CardTitle className="text-3xl font-semibold tracking-tight text-balance">
            Mi edificio
          </CardTitle>
          <CardDescription className="text-base leading-relaxed">
            Ingresá tu email y te enviamos un link para entrar.
            <br />
            No hace falta contraseña.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
