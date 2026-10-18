import { Megaphone } from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getCurrentConsorcioId } from "@/lib/consorcio-context";
import { getAnnouncementsForUser } from "@/lib/queries/announcements";
import { formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Comunicados — Mi edificio",
};

/**
 * Los avisos de la administración que no son de plata: un corte de agua, una
 * asamblea. Es adonde apuntan el aviso y el mail de cada comunicado. Ver
 * docs/comunicados-y-consultas.md.
 */
export default async function ComunicadosPage() {
  const user = await requireUser();
  const consorcioId = await getCurrentConsorcioId(user);
  const items = await getAnnouncementsForUser(user, consorcioId);

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <PageHeader
          backHref="/"
          backLabel="Volver al inicio"
          icon={Megaphone}
          tone="blue"
          title="Comunicados"
        />

        {items.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            tone="blue"
            title="Sin comunicados todavía"
            description="Cuando la administración mande un aviso —un corte de agua, una asamblea— lo vas a ver acá."
          />
        ) : (
          <ul className="flex flex-col gap-3" aria-label="Comunicados">
            {items.map((a) => (
              <li key={a.id}>
                <Card>
                  <CardContent className="flex flex-col gap-2 p-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <h2 className="text-lg font-semibold leading-snug text-balance">
                        {a.title}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(a.createdAt)}
                      </p>
                    </div>
                    {a.unitLabel && (
                      <p className="text-sm font-semibold text-spot-blue">
                        Para tu unidad
                      </p>
                    )}
                    <p className="whitespace-pre-line text-base leading-relaxed">
                      {a.body}
                    </p>
                    {a.authorName && (
                      <p className="text-sm text-muted-foreground">
                        {a.authorName}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
