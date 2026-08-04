import { SkeletonLine, SkeletonPageHeader } from "@/components/skeletons";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Espejo de la pantalla de "Más": dos grupos, cada uno una tarjeta con filas
 * divididas. Antes esta pantalla caía en el skeleton genérico de `(app)`, que
 * dibuja tarjetas separadas y no se parece.
 *
 * Cuántas filas tiene cada grupo depende de si el consorcio tiene amenities, y
 * eso no se sabe hasta tener el dato: dibujamos dos y dos, que es el caso con
 * amenities. Sin amenities sobra una fila en el segundo grupo.
 */
export default function MasLoading() {
  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <SkeletonPageHeader />
        <NavGroupSkeleton titleWidth="w-12" />
        <NavGroupSkeleton titleWidth="w-32" />
      </div>
    </main>
  );
}

/** Un grupo: el título (text-base) y una tarjeta con dos filas. */
function NavGroupSkeleton({ titleWidth }: { titleWidth: string }) {
  return (
    <section className="flex flex-col gap-3">
      <SkeletonLine box="h-6" bar="h-4" width={titleWidth} />
      <Card>
        <CardContent className="flex flex-col divide-y divide-border/60 p-0">
          <NavRowSkeleton />
          <NavRowSkeleton />
        </CardContent>
      </Card>
    </section>
  );
}

/** Una fila: tile de ícono (size-10), nombre y descripción, y el chevron. */
function NavRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <Skeleton className="size-10 shrink-0 rounded-2xl" />
      <div className="flex min-w-0 flex-1 flex-col">
        <SkeletonLine box="h-5" bar="h-4" width="w-28" />
        <SkeletonLine box="h-6" bar="h-3" width="w-48" />
      </div>
      <Skeleton className="size-5 shrink-0 rounded-md" />
    </div>
  );
}
