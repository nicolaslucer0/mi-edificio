import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getConsorcioForAdmin } from "@/lib/queries/admin";

export default async function ConsorcioAdminLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ consorcioId: string }>;
}>) {
  const user = await requireUser();
  const { consorcioId } = await params;
  // Gate every admin sub-page on access to this consorcio. Switching consorcio
  // now lives in the app-bar selector (see components/app-shell).
  const consorcio = await getConsorcioForAdmin(user, consorcioId);
  if (!consorcio) notFound();

  return <div className="flex flex-1 flex-col">{children}</div>;
}
