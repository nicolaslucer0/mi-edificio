import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import {
  getConsorcioForAdmin,
  getConsorciosForAdmin,
} from "@/lib/queries/admin";
import { ConsorcioSwitcher } from "./consorcio-switcher";

export default async function ConsorcioAdminLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ consorcioId: string }>;
}>) {
  const user = await requireUser();
  const { consorcioId } = await params;
  const [consorcio, allConsorcios] = await Promise.all([
    getConsorcioForAdmin(user, consorcioId),
    getConsorciosForAdmin(user),
  ]);
  if (!consorcio) notFound();

  const showSwitcher = allConsorcios.length > 1 || user.isSuperAdmin;

  return (
    <div className="flex flex-1 flex-col">
      {showSwitcher && (
        <div className="border-b border-border/40 bg-background/60 px-4 py-3 sm:px-6">
          <div className="mx-auto w-full max-w-2xl">
            <ConsorcioSwitcher
              current={{ id: consorcio.id, name: consorcio.name }}
              options={allConsorcios.map((c) => ({ id: c.id, name: c.name }))}
              isSuperAdmin={user.isSuperAdmin}
            />
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
