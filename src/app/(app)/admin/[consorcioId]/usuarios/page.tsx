import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import {
  getConsorcioForAdmin,
  getUnitsForAdmin,
  type AdminConsorcio,
  type AdminUnit,
} from "@/lib/queries/admin";
import {
  getUsersForAdmin,
  type UserWithMemberships,
} from "@/lib/queries/users";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { AddAssignmentButton } from "./add-assignment-button";
import { AddMembershipForm } from "./add-membership-form";
import { MembershipRow } from "./membership-row";

export const metadata: Metadata = {
  title: "Vecinos — Mi edificio",
};

export default async function UsuariosPage({
  params,
}: Readonly<{
  params: Promise<{ consorcioId: string }>;
}>) {
  const user = await requireUser();
  const { consorcioId } = await params;

  const [consorcio, allUnits, usersList] = await Promise.all([
    getConsorcioForAdmin(user, consorcioId),
    getUnitsForAdmin(user),
    getUsersForAdmin(user, { consorcioId }),
  ]);
  if (!consorcio) notFound();

  const consorcios = [consorcio];
  const units = allUnits.filter((u) => u.consorcioId === consorcioId);

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <PageHeader
          backHref={`/admin/${consorcioId}`}
          backLabel="Volver al panel del consorcio"
          icon={Users}
          tone="teal"
          title="Vecinos"
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Agregar vecino
            </CardTitle>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Si el email ya existe, se le suma la asignación. Si no, queda
              habilitado para entrar con su email.
            </p>
          </CardHeader>
          <CardContent>
            <AddMembershipForm consorcios={consorcios} units={units} />
          </CardContent>
        </Card>

        <section
          aria-labelledby="users-list-heading"
          className="flex flex-col gap-3"
        >
          <h2
            id="users-list-heading"
            className="text-lg font-semibold tracking-tight"
          >
            Vecinos cargados
            {usersList.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({usersList.length})
              </span>
            )}
          </h2>
          {usersList.length === 0 ? (
            <EmptyState
              icon={Users}
              tone="teal"
              title="Sin vecinos todavía"
              description="Usá el formulario de arriba para sumar al primero."
            />
          ) : (
            <ul
              data-stagger
              className="flex flex-col gap-3"
              aria-label="Lista de vecinos"
            >
              {usersList.map((u, idx) => (
                <li
                  key={u.id}
                  id={`user-${u.id}`}
                  className="scroll-mt-24"
                  style={{ "--stagger-index": idx } as React.CSSProperties}
                >
                  <UserCard
                    userRow={u}
                    consorcios={consorcios}
                    units={units}
                    consorcioId={consorcioId}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function UserCard({
  userRow,
  consorcios,
  units,
  consorcioId,
}: Readonly<{
  userRow: UserWithMemberships;
  consorcios: AdminConsorcio[];
  units: AdminUnit[];
  consorcioId: string;
}>) {
  const display = userRow.name ?? userRow.email;
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex flex-col">
          <p className="text-sm font-semibold leading-tight">{display}</p>
          {userRow.name && (
            <p className="truncate text-xs text-muted-foreground">
              {userRow.email}
            </p>
          )}
        </div>
        {userRow.memberships.length === 0 ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Sin asignaciones en este consorcio.
          </p>
        ) : (
          <ul className="flex flex-col gap-2" aria-label="Asignaciones">
            {userRow.memberships.map((m) => {
              const unitsInConsorcio = m.consorcioId
                ? units.filter((u) => u.consorcioId === m.consorcioId)
                : [];
              return (
                <li key={m.membershipId}>
                  <MembershipRow
                    membership={m}
                    unitsInConsorcio={unitsInConsorcio}
                    consorcioId={consorcioId}
                  />
                </li>
              );
            })}
          </ul>
        )}
        <AddAssignmentButton
          email={userRow.email}
          consorcios={consorcios}
          units={units}
        />
      </CardContent>
    </Card>
  );
}
