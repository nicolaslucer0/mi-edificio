import Link from "next/link";
import { ChevronRight, LayoutGrid } from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getCurrentConsorcioId } from "@/lib/consorcio-context";
import { hasReservableAmenities } from "@/lib/queries/amenities";
import {
  getSecondaryNavItems,
  type NavItem,
} from "@/components/app-shell/nav-items";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Más — Mi edificio",
};

const GROUPS: ReadonlyArray<{
  key: NonNullable<NavItem["group"]>;
  title: string;
}> = [
  { key: "vos", title: "Vos" },
  { key: "consorcio", title: "El consorcio" },
];

/**
 * El resto de los destinos, fuera de la barra de abajo.
 *
 * Es una página y no un panel que sube: tiene URL, funciona el botón de atrás,
 * y sobre todo puede tener filas grandes con nombre y descripción. Para un
 * vecino mayor, una lista a pantalla completa bien rotulada es más fácil que
 * seis íconos apretados con etiquetas de 11 px.
 */
export default async function MasPage() {
  const user = await requireUser();
  const isAdmin = user.isAdmin || user.isSuperAdmin;
  const consorcioId = await getCurrentConsorcioId(user);
  const hasAmenities = await hasReservableAmenities(consorcioId);

  const items = getSecondaryNavItems(isAdmin, hasAmenities);

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <PageHeader
          backHref="/"
          backLabel="Volver al inicio"
          icon={LayoutGrid}
          tone="violet"
          title="Más"
        />

        {GROUPS.map((group) => {
          const groupItems = items.filter((i) => i.group === group.key);
          if (groupItems.length === 0) return null;
          return (
            <section key={group.key} className="flex flex-col gap-3">
              <h2 className="text-base font-semibold">{group.title}</h2>
              <Card>
                <CardContent className="flex flex-col divide-y divide-border/60 p-0">
                  {groupItems.map((item) => (
                    <NavRow key={item.href} item={item} />
                  ))}
                </CardContent>
              </Card>
            </section>
          );
        })}
      </div>
    </main>
  );
}

/** Desde "Más" siempre se entra: la pantalla nueva viene desde la derecha. */
const FORWARD = ["nav-forward"];

function NavRow({ item }: Readonly<{ item: NavItem }>) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      transitionTypes={FORWARD}
      className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-muted/40 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground"
      >
        <Icon className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-base font-medium leading-tight">
          {item.label}
        </span>
        {item.description && (
          <span className="text-sm leading-relaxed text-muted-foreground">
            {item.description}
          </span>
        )}
      </span>
      <ChevronRight
        aria-hidden="true"
        className="size-5 shrink-0 text-muted-foreground"
      />
    </Link>
  );
}
