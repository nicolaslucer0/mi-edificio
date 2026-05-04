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
      <Sidebar name={user.name} email={user.email} isAdmin={isAdmin} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar name={user.name} email={user.email} isAdmin={isAdmin} />
        <div className="flex flex-1 flex-col pb-24 lg:pb-0">{children}</div>
        <BottomNav isAdmin={isAdmin} />
      </div>
    </div>
  );
}
