import { requireUser } from "@/lib/session";
import { TopBar } from "@/components/app-shell/top-bar";
import { BottomNav } from "@/components/app-shell/bottom-nav";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  const isAdmin = user.isAdmin || user.isSuperAdmin;

  return (
    <div className="flex min-h-full flex-col">
      <TopBar name={user.name} email={user.email} isAdmin={isAdmin} />
      <div className="flex flex-1 flex-col pb-24">{children}</div>
      <BottomNav />
    </div>
  );
}
