import { Wallet } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PaymentInfo } from "@/lib/queries/consorcios";
import { CopyButton } from "@/components/copy-button";
import { currentPeriod, formatPeriod, formatUnitShort } from "@/lib/format";

export function PaymentInfoCard({
  consorcio,
}: Readonly<{ consorcio: PaymentInfo }>) {
  const hasInfo = Boolean(consorcio.alias ?? consorcio.cbu);
  // Qué poner en el concepto: la unidad y el mes. Con dos edificios
  // numerados igual, es lo que le dice al admin de quién es la transferencia.
  const month = formatPeriod(currentPeriod());
  const concepts = consorcio.units.map((u) => `${formatUnitShort(u)} ${month}`);

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
            <PaymentField label="Alias" value={consorcio.alias} mono copy="alias" />
          )}
          {consorcio.cbu && (
            <PaymentField label="CBU" value={consorcio.cbu} mono copy="CBU" />
          )}
          {concepts.map((concept) => (
            <PaymentField
              key={concept}
              label="En el concepto poné"
              value={concept}
              copy="concepto"
            />
          ))}
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
  copy,
}: Readonly<{
  label: string;
  value: string;
  mono?: boolean;
  /** Si va botón de copiar, qué se copia (para el aria-label). */
  copy?: string;
}>) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="flex items-center justify-between gap-3">
        <span
          className={
            mono
              ? "min-w-0 break-all font-mono text-base tabular-nums select-all"
              : "min-w-0 text-base font-medium select-all"
          }
        >
          {value}
        </span>
        {copy && <CopyButton value={value} label={copy} />}
      </dd>
    </div>
  );
}
