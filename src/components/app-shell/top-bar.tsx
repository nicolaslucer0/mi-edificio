import Link from "next/link";
import { Building2 } from "lucide-react";
import { UserMenu } from "./user-menu";
import { ConsorcioSelector } from "./consorcio-selector";

type Props = {
  name: string | null;
  email: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  consorcios: Array<{ id: string; name: string }>;
  currentConsorcioId: string | null;
};

export function TopBar({
  name,
  email,
  isAdmin,
  isSuperAdmin,
  consorcios,
  currentConsorcioId,
}: Readonly<Props>) {
  const hasConsorcios = consorcios.length > 0;

  return (
    <header className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/60 lg:hidden">
      <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Link
            href="/"
            aria-label="Ir al inicio"
            className="inline-flex items-center gap-2 text-base font-semibold tracking-tight transition-opacity hover:opacity-80 touch-manipulation"
          >
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            >
              <Building2 className="size-4" />
            </span>
            {!hasConsorcios && <span>Mi edificio</span>}
          </Link>
          {hasConsorcios && (
            <ConsorcioSelector
              variant="bar"
              options={consorcios}
              currentId={currentConsorcioId}
              isAdmin={isAdmin}
              isSuperAdmin={isSuperAdmin}
            />
          )}
        </div>
        <UserMenu name={name} email={email} isAdmin={isAdmin} />
      </div>
    </header>
  );
}
