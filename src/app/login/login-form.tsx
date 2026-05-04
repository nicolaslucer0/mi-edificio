"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, type LoginState } from "@/lib/actions/login";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email" className="text-base">
          Tu email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="vos@ejemplo.com"
          aria-invalid={state?.error ? true : undefined}
          aria-describedby={state?.error ? "email-error" : undefined}
          className="h-14 text-lg"
        />
      </div>

      {state?.error && (
        <p
          id="email-error"
          role="alert"
          aria-live="polite"
          className="text-sm leading-relaxed text-destructive"
        >
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="h-14 text-base touch-manipulation"
      >
        {pending ? "Enviando…" : "Enviar link para entrar"}
      </Button>
    </form>
  );
}
