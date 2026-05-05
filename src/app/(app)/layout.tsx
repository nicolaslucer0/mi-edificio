import { requireUser } from "@/lib/session";
import { TopBar } from "@/components/app-shell/top-bar";
import { BottomNav } from "@/components/app-shell/bottom-nav";
import { Sidebar } from "@/components/app-shell/sidebar";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  const isAdmin = user.isAdmin || user.isSuperAdmin;

  return (
    <div className="flex min-h-full lg:flex-row flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg"
      >
        Saltar al contenido
      </a>
      <Sidebar name={user.name} email={user.email} isAdmin={isAdmin} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar name={user.name} email={user.email} isAdmin={isAdmin} />
        <div
          id="main-content"
          tabIndex={-1}
          className="flex flex-1 flex-col pb-24 outline-none lg:pb-0"
        >
          {children}
        </div>
        <BottomNav isAdmin={isAdmin} />
      </div>
    </div>
  );
}
