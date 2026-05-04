import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  if (!user.isSuperAdmin && !user.isAdmin) {
    redirect("/");
  }
  return <>{children}</>;
}
