"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, SlidersHorizontal, X } from "lucide-react";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
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

  // Lo elegido adentro del panel es un borrador: recién se aplica al
  // confirmar. Además de evitar una navegación por cada tap, saca de encima
  // la transición de página, que dibuja una captura del contenido por arriba
  // del modal mientras anima (ver (app)/template.tsx).
  const [draftCategory, setDraftCategory] = useState(category);
  const [draftMonth, setDraftMonth] = useState(month);

  const activeCount = (category ? 1 : 0) + (month ? 1 : 0);
  const draftCount = (draftCategory ? 1 : 0) + (draftMonth ? 1 : 0);
  const draftChanged = draftCategory !== category || draftMonth !== month;

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

  function handleOpenChange(next: boolean) {
    // Al abrir, el borrador arranca de lo aplicado; al cerrar sin confirmar,
    // se descarta.
    if (next) {
      setDraftCategory(category);
      setDraftMonth(month);
    }
    setOpen(next);
  }

  function applyDraft() {
    // Primero cerrar: así la transición de página arranca con el panel ya
    // fuera de pantalla.
    setOpen(false);
    if (!draftChanged) return;
    setParams({
      category: draftCategory ?? null,
      month: draftMonth ?? null,
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
              selected={draftCategory === c}
              onToggle={() =>
                setDraftCategory(draftCategory === c ? undefined : c)
              }
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
            value={draftMonth ?? ""}
            max={currentPeriod()}
            onChange={(e) => setDraftMonth(e.target.value || undefined)}
            className="h-12 flex-1 text-base"
          />
          {draftMonth && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDraftMonth(undefined)}
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
        onClick={applyDraft}
        className="h-12 text-base touch-manipulation"
      >
        {/* Sin cambios podemos prometer el número exacto; con cambios todavía
            no lo sabemos, así que no lo inventamos. */}
        {draftChanged
          ? "Aplicar filtros"
          : resultCount === 1
            ? "Ver 1 gasto"
            : `Ver ${resultCount} gastos`}
      </Button>
      {draftCount > 0 && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setDraftCategory(undefined);
            setDraftMonth(undefined);
          }}
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
        onClick={() => handleOpenChange(true)}
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

      <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Filtrar gastos</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Elegí una categoría, un mes, o los dos.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogBody className="gap-6">{fields}</ResponsiveDialogBody>
          <ResponsiveDialogFooter>{footer}</ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
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
  onToggle,
}: Readonly<{
  category: ExpenditureCategory;
  selected: boolean;
  onToggle: () => void;
}>) {
  const Icon = CATEGORY_ICON[category];
  const tone = CATEGORY_TONE[category];
  return (
    <button
      type="button"
      onClick={onToggle}
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
