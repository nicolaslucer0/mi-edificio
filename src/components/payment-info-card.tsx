import { Wallet } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PaymentInfo } from "@/lib/queries/consorcios";

export function PaymentInfoCard({
  consorcio,
}: Readonly<{ consorcio: PaymentInfo }>) {
  const hasInfo = Boolean(consorcio.alias ?? consorcio.cbu);

  if (!hasInfo) {
    return (
      <Card className="border-dashed">
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <div
            aria-hidden="true"
            className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground"
          >
            <Wallet className="size-5" />
          </div>
          <CardTitle className="text-base font-semibold">
            Cómo pagar las expensas
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground">
          Los datos de pago todavía no están cargados. Pedile al administrador
          del consorcio que los agregue.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <div
          aria-hidden="true"
          className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <Wallet className="size-5" />
        </div>
        <CardTitle className="text-base font-semibold">
          Cómo pagar las expensas
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Transferí el monto a esta cuenta:
        </p>
        <dl className="flex flex-col gap-3">
          {consorcio.holderName && (
            <PaymentField label="Titular" value={consorcio.holderName} />
          )}
          {consorcio.alias && (
            <PaymentField label="Alias" value={consorcio.alias} mono />
          )}
          {consorcio.cbu && (
            <PaymentField label="CBU" value={consorcio.cbu} mono />
          )}
        </dl>
        <p className="rounded-md bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
          Después de transferir, volvé acá y apretá{" "}
          <strong className="font-semibold">Ya pagué</strong> en la expensa
          correspondiente para que el administrador la valide.
        </p>
      </CardContent>
    </Card>
  );
}

function PaymentField({
  label,
  value,
  mono = false,
}: Readonly<{ label: string; value: string; mono?: boolean }>) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd
        className={
          mono
            ? "break-all font-mono text-base tabular-nums select-all"
            : "text-base font-medium select-all"
        }
      >
        {value}
      </dd>
    </div>
  );
}
