"use client";

import { useActionState } from "react";
import { ArrowRight, Mail } from "lucide-react";
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
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email" className="text-sm">
          Tu email
        </Label>
        <div className="relative">
          <Mail
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            required
            placeholder="vos@ejemplo.com"
            aria-invalid={state?.error ? true : undefined}
            aria-describedby={state?.error ? "email-error" : undefined}
            className="h-14 pl-12 text-base"
          />
        </div>
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
        className="h-14 gap-2 text-base touch-manipulation"
      >
        {pending ? "Enviando…" : "Enviar link para entrar"}
        {!pending && <ArrowRight aria-hidden="true" className="size-4" />}
      </Button>
    </form>
  );
}
