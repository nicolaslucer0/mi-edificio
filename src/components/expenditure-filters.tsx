"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, SlidersHorizontal, X } from "lucide-react";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  currentPeriod,
  EXPENDITURE_CATEGORIES,
  formatExpenditureCategory,
  formatPeriod,
  type ExpenditureCategory,
} from "@/lib/format";
import { CATEGORY_ICON, CATEGORY_TONE } from "@/lib/expenditure-categories";
import { TILE_TONES } from "@/lib/tones";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";

type Props = {
  category: string | undefined;
  month: string | undefined;
  basePath?: string;
  /** Cuántos gastos está mostrando la lista con los filtros puestos. */
  resultCount: number;
};

/**
 * Un botón que abre todos los filtros, con lo que está activo a la vista.
 *
 * Los chips de afuera no son decoración: si el panel esconde los controles, el
 * estado tiene que quedar visible igual. Si no, alguien filtra por "Limpieza",
 * vuelve más tarde, ve tres gastos y cree que el consorcio gastó tres veces.
 */
export function ExpenditureFilters({
  category,
  month,
  basePath = "/gastos",
  resultCount,
}: Readonly<Props>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  // En pantalla grande un panel que sube desde abajo queda raro: va modal.
  const isDesktop = useMediaQuery("(min-width: 640px)");

  const activeCount = (category ? 1 : 0) + (month ? 1 : 0);

  function setParams(changes: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    // Al cambiar un filtro, la paginación vuelve al principio.
    params.delete("page");
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${basePath}?${qs}` : basePath);
    });
  }

  const fields = (
    <>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-base font-medium">Categoría</legend>
        <div className="grid grid-cols-2 gap-2">
          {EXPENDITURE_CATEGORIES.map((c) => (
            <CategoryTile
              key={c}
              category={c}
              selected={category === c}
              disabled={pending}
              onToggle={() => setParams({ category: category === c ? null : c })}
            />
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="filter-month" className="text-base font-medium">
          Mes
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="filter-month"
            type="month"
            value={month ?? ""}
            max={currentPeriod()}
            disabled={pending}
            onChange={(e) => setParams({ month: e.target.value || null })}
            className="h-12 flex-1 text-base"
          />
          {month && (
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => setParams({ month: null })}
              className="h-12 shrink-0 touch-manipulation"
            >
              Todos
            </Button>
          )}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Vacío = todos los meses.
        </p>
      </div>
    </>
  );

  const footer = (
    <>
      <Button
        type="button"
        onClick={() => setOpen(false)}
        className="h-12 text-base touch-manipulation"
      >
        {resultCount === 1 ? "Ver 1 gasto" : `Ver ${resultCount} gastos`}
      </Button>
      {activeCount > 0 && (
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => setParams({ category: null, month: null })}
          className="h-11 text-base touch-manipulation"
        >
          Limpiar filtros
        </Button>
      )}
    </>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant={activeCount > 0 ? "default" : "outline"}
        onClick={() => setOpen(true)}
        className="h-11 px-4 text-base touch-manipulation"
      >
        <SlidersHorizontal aria-hidden="true" className="size-4" />
        Filtrar
        {activeCount > 0 && ` · ${activeCount}`}
      </Button>

      {category && (
        <FilterChip
          label={formatExpenditureCategory(category as ExpenditureCategory)}
          onClear={() => setParams({ category: null })}
          disabled={pending}
        />
      )}
      {month && (
        <FilterChip
          label={formatPeriod(month)}
          onClear={() => setParams({ month: null })}
          disabled={pending}
        />
      )}

      {isDesktop ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg">Filtrar gastos</DialogTitle>
              <DialogDescription className="leading-relaxed">
                Elegí una categoría, un mes, o los dos.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-6">{fields}</div>
            <DialogFooter className="sm:flex-row-reverse sm:justify-start">
              {footer}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Filtrar gastos</DrawerTitle>
              <DrawerDescription>
                Elegí una categoría, un mes, o los dos.
              </DrawerDescription>
            </DrawerHeader>
            <DrawerBody className="gap-6">{fields}</DrawerBody>
            <DrawerFooter>{footer}</DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}

function FilterChip({
  label,
  onClear,
  disabled,
}: Readonly<{ label: string; onClear: () => void; disabled: boolean }>) {
  return (
    <button
      type="button"
      onClick={onClear}
      disabled={disabled}
      aria-label={`Quitar el filtro ${label}`}
      className="inline-flex h-11 items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3.5 text-sm font-medium transition-colors hover:bg-muted touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {label}
      <X aria-hidden="true" className="size-4 text-muted-foreground" />
    </button>
  );
}

function CategoryTile({
  category,
  selected,
  disabled,
  onToggle,
}: Readonly<{
  category: ExpenditureCategory;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}>) {
  const Icon = CATEGORY_ICON[category];
  const tone = CATEGORY_TONE[category];
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "relative flex min-h-20 flex-col items-start gap-2 rounded-xl border p-3 text-left transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary bg-primary/5"
          : "border-border/60 hover:bg-muted/50",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl",
          tone ? TILE_TONES[tone] : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="text-sm font-medium leading-tight">
        {formatExpenditureCategory(category)}
      </span>
      {selected && (
        <span
          aria-hidden="true"
          className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          <Check className="size-3" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}
