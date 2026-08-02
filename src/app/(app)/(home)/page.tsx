import { requireUser, roleLabel } from "@/lib/session";
import { getCurrentConsorcioId } from "@/lib/consorcio-context";
import { widgetsForUser } from "@/components/widgets/registry";

function getGreeting(): string {
  const hour = Number.parseInt(
    new Intl.DateTimeFormat("es-AR", {
      hour: "2-digit",
      hour12: false,
      timeZone: "America/Argentina/Buenos_Aires",
    }).format(new Date()),
    10,
  );
  if (hour < 12) return "Buen día";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

function getFirstName(name: string | null, email: string): string {
  if (name) return name.split(/\s+/)[0];
  return email.split("@")[0];
}

export default async function Home({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | undefined>>;
}>) {
  const user = await requireUser();
  const consorcioId = await getCurrentConsorcioId(user);
  const params = await searchParams;

  const firstName = getFirstName(user.name, user.email);
  const widgets = widgetsForUser(user);

  return (
    <main className="flex flex-1 flex-col gap-7 px-4 pt-6 pb-10 sm:px-6">
      <section className="mx-auto w-full max-w-2xl">
        <p className="text-sm text-muted-foreground">{getGreeting()},</p>
        <h1 className="text-3xl font-bold tracking-tight text-balance">
          {firstName} 👋
        </h1>
        {/* Sin resumen de deuda acá: lo decía igual que la tarjeta de abajo,
            dos veces la misma frase en la misma pantalla. */}
        <p className="mt-1 text-sm text-muted-foreground">
          {roleLabel(user.primaryRole)}
        </p>
      </section>

      {/* Grilla de widgets: una columna en mobile, dos en desktop. Cada widget
          decide si se muestra y cuánto ocupa; ver components/widgets. */}
      <div className="mx-auto grid w-full max-w-2xl grid-cols-1 gap-7 sm:grid-cols-2">
        {widgets.map(({ id, Component }) => (
          <Component
            key={id}
            user={user}
            consorcioId={consorcioId}
            searchParams={params}
          />
        ))}
      </div>
    </main>
  );
}
