"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, Pencil, Plus, Trash2 } from "lucide-react";
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
import {
  createAmenity,
  deleteAmenity,
  updateAmenity,
} from "@/lib/actions/amenities";
import { hourLabel } from "@/lib/amenities";
import type { Amenity } from "@/lib/queries/amenities";

const OPEN_HOURS = Array.from({ length: 24 }, (_, i) => i); // 0..23
const CLOSE_HOURS = Array.from({ length: 24 }, (_, i) => i + 1); // 1..24

export function AmenitiesManager({
  consorcioId,
  amenities,
}: Readonly<{ consorcioId: string; amenities: Amenity[] }>) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Amenity | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [delPending, startDelete] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = editing
        ? await updateAmenity(null, formData)
        : await createAmenity(null, formData);
      if (result.ok) {
        toast.success(editing ? "Amenity actualizada." : "Amenity creada.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    startDelete(async () => {
      const result = await deleteAmenity(id);
      if (result.ok) {
        toast.success("Amenity eliminada.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
      setDeletingId(null);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Button
        onClick={() => {
          setEditing(null);
          setOpen(true);
        }}
        className="h-11 px-5 text-sm touch-manipulation"
      >
        <Plus aria-hidden="true" className="size-4" />
        Nueva amenity
      </Button>

      {amenities.length === 0 ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Todavía no cargaste amenities.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {amenities.map((a) => (
            <li key={a.id}>
              <Card>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold">
                      {a.name}
                      {!a.reservable && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          (no reservable)
                        </span>
                      )}
                    </p>
                    <p className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                      <Clock aria-hidden="true" className="size-3.5" />
                      {hourLabel(a.openHour)}–{hourLabel(a.closeHour)} · máx{" "}
                      {a.maxHours}h
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditing(a);
                        setOpen(true);
                      }}
                      aria-label={`Editar ${a.name}`}
                      className="h-9 px-2 text-muted-foreground hover:text-foreground touch-manipulation"
                    >
                      <Pencil aria-hidden="true" className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleDelete(a.id)}
                      disabled={delPending && deletingId === a.id}
                      aria-label={`Eliminar ${a.name}`}
                      className="h-9 px-2 text-destructive hover:text-destructive touch-manipulation"
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {editing ? "Editar amenity" : "Nueva amenity"}
            </DrawerTitle>
            <DrawerDescription>
              Configurá el espacio y su disponibilidad para reservar.
            </DrawerDescription>
          </DrawerHeader>
          <form
            key={editing?.id ?? "new"}
            action={handleSubmit}
            className="contents"
          >
            <input type="hidden" name="consorcioId" value={consorcioId} />
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <DrawerBody className="gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="am-name" className="text-sm">
                  Nombre
                </Label>
                <Input
                  id="am-name"
                  name="name"
                  defaultValue={editing?.name ?? ""}
                  maxLength={80}
                  required
                  placeholder="Ej. Pileta, Terraza, SUM"
                  className="h-12 text-base"
                  disabled={isPending}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="am-desc" className="text-sm">
                  Descripción (opcional)
                </Label>
                <Textarea
                  id="am-desc"
                  name="description"
                  rows={2}
                  maxLength={300}
                  defaultValue={editing?.description ?? ""}
                  disabled={isPending}
                />
              </div>
              <label className="flex items-center gap-3 rounded-lg border border-border/60 p-3 touch-manipulation">
                <input
                  type="checkbox"
                  name="reservable"
                  defaultChecked={editing ? editing.reservable : true}
                  className="size-4 accent-primary"
                  disabled={isPending}
                />
                <span className="text-sm">Se puede reservar</span>
              </label>
              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-2">
                  <Label htmlFor="am-open" className="text-sm">
                    Abre
                  </Label>
                  <select
                    id="am-open"
                    name="openHour"
                    defaultValue={String(editing?.openHour ?? 8)}
                    disabled={isPending}
                    className="h-12 rounded-md border border-input bg-background px-3 text-base"
                  >
                    {OPEN_HOURS.map((h) => (
                      <option key={h} value={h}>
                        {hourLabel(h)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <Label htmlFor="am-close" className="text-sm">
                    Cierra
                  </Label>
                  <select
                    id="am-close"
                    name="closeHour"
                    defaultValue={String(editing?.closeHour ?? 23)}
                    disabled={isPending}
                    className="h-12 rounded-md border border-input bg-background px-3 text-base"
                  >
                    {CLOSE_HOURS.map((h) => (
                      <option key={h} value={h}>
                        {hourLabel(h)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="am-max" className="text-sm">
                  Máximo de horas por reserva
                </Label>
                <Input
                  id="am-max"
                  name="maxHours"
                  type="number"
                  min={1}
                  max={24}
                  step={1}
                  defaultValue={editing?.maxHours ?? 4}
                  className="h-12 text-base"
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
                {(() => {
                  if (isPending) return "Guardando…";
                  return editing ? "Guardar cambios" : "Crear amenity";
                })()}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="h-11 touch-manipulation"
              >
                Cancelar
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
