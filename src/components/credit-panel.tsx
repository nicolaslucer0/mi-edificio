"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PiggyBank, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requestCreditDeposit } from "@/lib/actions/expensas";
import { formatCurrencyCents } from "@/lib/format";

type UnitCredit = {
  unitId: string;
  unitLabel: string;
  creditCents: number;
};

export function CreditPanel({ units }: Readonly<{ units: UnitCredit[] }>) {
  const [open, setOpen] = useState(false);
  const [unitId, setUnitId] = useState(units[0]?.unitId ?? "");
  const [pesos, setPesos] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (units.length === 0) return null;

  const total = units.reduce((s, u) => s + u.creditCents, 0);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setPesos("");
      setError(null);
    }
  }

  function handleSubmit(formData: FormData) {
    const cents = Math.round(Number(pesos) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Ingresá cuánto vas a adelantar.");
      return;
    }
    if (!unitId) {
      setError("Elegí la unidad.");
      return;
    }
    formData.set("amountCents", String(cents));
    setError(null);
    startTransition(async () => {
      const result = await requestCreditDeposit(unitId, formData);
      if (result.ok) {
        handleOpenChange(false);
        toast.success("Listo. El administrador va a validar tu adelanto.", {
          duration: 5000,
        });
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
              <PiggyBank aria-hidden="true" className="size-5" />
            </span>
            <div>
              {total > 0 ? (
                <>
                  <p className="text-sm text-muted-foreground">Tenés a favor</p>
                  <p className="text-xl font-bold tabular-nums text-success">
                    {formatCurrencyCents(total)}
                  </p>
                </>
              ) : (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Podés adelantar plata y se usa sola en tus próximas expensas.
                </p>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setOpen(true)}
            className="h-11 px-4 text-sm touch-manipulation"
          >
            <Plus aria-hidden="true" className="size-4" />
            Cargar saldo
          </Button>
        </CardContent>
      </Card>

      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Cargar saldo a favor</DrawerTitle>
            <DrawerDescription>
              Informá un adelanto. El administrador lo valida y queda como saldo
              para tus próximas expensas.
            </DrawerDescription>
          </DrawerHeader>
          <form action={handleSubmit} className="contents">
            <DrawerBody className="gap-4">
              {units.length > 1 && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="credit-unit" className="text-sm">
                    Unidad
                  </Label>
                  <select
                    id="credit-unit"
                    value={unitId}
                    onChange={(e) => setUnitId(e.target.value)}
                    disabled={isPending}
                    className="h-12 rounded-md border border-input bg-background px-3 text-base"
                  >
                    {units.map((u) => (
                      <option key={u.unitId} value={u.unitId}>
                        Unidad {u.unitLabel}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Label htmlFor="credit-amount" className="text-sm">
                  Monto que transferís
                </Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="credit-amount"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    value={pesos}
                    onChange={(e) => {
                      setPesos(e.target.value);
                      setError(null);
                    }}
                    className="h-12 pl-7 text-base"
                    disabled={isPending}
                  />
                </div>
                {error && (
                  <p role="alert" className="text-xs text-destructive">
                    {error}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="credit-receipt" className="text-sm">
                  Comprobante (opcional)
                </Label>
                <Input
                  id="credit-receipt"
                  name="receipt"
                  type="file"
                  accept="image/*,application/pdf"
                  className="h-12 text-base file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-muted/80"
                  disabled={isPending}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="credit-note" className="text-sm">
                  Notas (opcional)
                </Label>
                <Textarea
                  id="credit-note"
                  name="note"
                  rows={2}
                  maxLength={500}
                  placeholder="Ej. adelanto de 2 meses"
                  disabled={isPending}
                />
              </div>
            </DrawerBody>
            <DrawerFooter>
              <Button
                type="submit"
                disabled={isPending}
                className="h-12 text-base touch-manipulation"
              >
                {isPending ? "Enviando…" : "Cargar saldo"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
                className="h-11 touch-manipulation"
              >
                Cancelar
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </>
  );
}
