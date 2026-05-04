import Link from "next/link";
import { Building2 } from "lucide-react";
import { UserMenu } from "./user-menu";

type Props = {
  name: string | null;
  email: string;
  isAdmin: boolean;
};

export function TopBar({ name, email, isAdmin }: Readonly<Props>) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-base font-semibold tracking-tight transition-opacity hover:opacity-80 touch-manipulation"
        >
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <Building2 className="size-4" />
          </span>
          <span>Mi edificio</span>
        </Link>
        <UserMenu name={name} email={email} isAdmin={isAdmin} />
      </div>
    </header>
  );
}
