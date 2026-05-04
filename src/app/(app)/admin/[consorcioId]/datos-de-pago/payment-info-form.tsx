"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  updatePaymentInfo,
  type ActionResult,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  consorcioId: string;
  consorcioName: string;
  paymentHolderName: string | null;
  paymentAlias: string | null;
  paymentCbu: string | null;
};

export function PaymentInfoForm({
  consorcioId,
  consorcioName,
  paymentHolderName,
  paymentAlias,
  paymentCbu,
}: Readonly<Props>) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(updatePaymentInfo, null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Datos de pago actualizados.");
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="consorcioId" value={consorcioId} />
      <p className="text-sm text-muted-foreground">
        Editando: <span className="font-medium text-foreground">{consorcioName}</span>
      </p>

      <div className="flex flex-col gap-2">
        <Label htmlFor="paymentHolderName" className="text-base">
          Titular de la cuenta
        </Label>
        <Input
          id="paymentHolderName"
          name="paymentHolderName"
          required
          defaultValue={paymentHolderName ?? ""}
          placeholder="Ej. Consorcio Aristóbulo del Valle 326/330"
          autoComplete="off"
          className="h-12 text-base"
          disabled={pending}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="paymentAlias" className="text-base">
          Alias
        </Label>
        <Input
          id="paymentAlias"
          name="paymentAlias"
          required
          defaultValue={paymentAlias ?? ""}
          placeholder="Ej. consorcio.av326.mp"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="h-12 text-base font-mono"
          disabled={pending}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="paymentCbu" className="text-base">
          CBU / CVU{" "}
          <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <Input
          id="paymentCbu"
          name="paymentCbu"
          inputMode="numeric"
          defaultValue={paymentCbu ?? ""}
          placeholder="22 dígitos"
          autoComplete="off"
          spellCheck={false}
          className="h-12 text-base font-mono tabular-nums"
          disabled={pending}
        />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Si lo cargás, tienen que ser exactamente 22 dígitos numéricos.
        </p>
      </div>

      {state && !state.ok && (
        <p role="alert" className="text-sm text-destructive leading-relaxed">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="h-12 text-base touch-manipulation"
      >
        {pending ? "Guardando…" : "Guardar datos"}
      </Button>
    </form>
  );
}
