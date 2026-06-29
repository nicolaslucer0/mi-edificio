"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const PESO_FORMAT = new Intl.NumberFormat("es-AR");

type Props = {
  /** Form field name. A hidden input carries the raw integer (pesos). */
  name: string;
  /** Raw digits, e.g. "105000". */
  value: string;
  onValueChange: (digits: string) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedById?: string;
  className?: string;
};

/**
 * Peso amount input that shows thousands separators ("$ 105.000") while typing
 * but submits a plain integer, so large amounts are hard to mistype.
 */
export function CurrencyInput({
  name,
  value,
  onValueChange,
  id,
  placeholder,
  disabled,
  invalid,
  describedById,
  className,
}: Readonly<Props>) {
  const display = value ? PESO_FORMAT.format(Number(value)) : "";

  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-medium text-muted-foreground"
      >
        $
      </span>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        onChange={(e) =>
          onValueChange(e.target.value.replace(/\D/g, "").slice(0, 12))
        }
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={describedById}
        className={cn("h-12 pl-7 text-base tabular-nums", className)}
      />
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
