import { notFound } from "next/navigation";
import { CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getConsorcioForAdmin } from "@/lib/queries/admin";
import { getAmenitiesForConsorcio } from "@/lib/queries/amenities";
import { PageHeader } from "@/components/page-header";
import { AmenitiesManager } from "@/components/amenities-manager";

export const metadata: Metadata = {
  title: "Gestionar amenities — Mi edificio",
};

export default async function AdminAmenitiesPage({
  params,
}: Readonly<{ params: Promise<{ consorcioId: string }> }>) {
  const { consorcioId } = await params;
  const user = await requireUser();
  const consorcio = await getConsorcioForAdmin(user, consorcioId);
  if (!consorcio) notFound();

  const amenities = await getAmenitiesForConsorcio(consorcioId);

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <PageHeader
          backHref={`/admin/${consorcioId}`}
          backLabel="Volver al panel del consorcio"
          icon={CalendarDays}
          tone="teal"
          title="Amenities"
          subtitle={consorcio.name}
        />
        <p className="text-sm leading-relaxed text-muted-foreground">
          Cargá los espacios comunes y marcá cuáles se pueden reservar. Los
          vecinos reservan por hora dentro del horario que definas.
        </p>
        <AmenitiesManager consorcioId={consorcioId} amenities={amenities} />
      </div>
    </main>
  );
}
