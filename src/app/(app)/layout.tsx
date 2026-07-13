import { requireUser } from "@/lib/session";
import {
  getAvailableConsorcios,
  getCurrentConsorcioId,
} from "@/lib/consorcio-context";
import { getAccessibleConsorcioIds } from "@/lib/queries/admin";
import { hasReservableAmenities } from "@/lib/queries/amenities";
import {
  getRecentNotifications,
  getUnreadCount,
} from "@/lib/notifications";
import { TopBar } from "@/components/app-shell/top-bar";
import { BottomNav } from "@/components/app-shell/bottom-nav";
import { Sidebar } from "@/components/app-shell/sidebar";
import { ActionFab } from "@/components/app-shell/action-fab";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  const isAdmin = user.isAdmin || user.isSuperAdmin;
  const [consorcios, currentConsorcioId, recentNotifications, unreadCount] =
    await Promise.all([
      getAvailableConsorcios(user),
      getCurrentConsorcioId(user),
      getRecentNotifications(user.id),
      getUnreadCount(user.id),
    ]);
  const hasAmenities = await hasReservableAmenities(currentConsorcioId);

  // The "+" acts on the selected consorcio when the user administers it,
  // otherwise on the first one they administer.
  let fabConsorcioId: string | null = null;
  if (isAdmin) {
    const adminIds = getAccessibleConsorcioIds(user);
    if (adminIds === "all") {
      fabConsorcioId = currentConsorcioId ?? consorcios[0]?.id ?? null;
    } else if (currentConsorcioId && adminIds.includes(currentConsorcioId)) {
      fabConsorcioId = currentConsorcioId;
    } else {
      fabConsorcioId = adminIds[0] ?? null;
    }
  }

  return (
    <div className="flex min-h-full lg:flex-row flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg"
      >
        Saltar al contenido
      </a>
      <Sidebar
        name={user.name}
        email={user.email}
        isAdmin={isAdmin}
        isSuperAdmin={user.isSuperAdmin}
        hasAmenities={hasAmenities}
        consorcios={consorcios}
        currentConsorcioId={currentConsorcioId}
        notifications={recentNotifications}
        unreadCount={unreadCount}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          name={user.name}
          email={user.email}
          isAdmin={isAdmin}
          isSuperAdmin={user.isSuperAdmin}
          consorcios={consorcios}
          currentConsorcioId={currentConsorcioId}
          notifications={recentNotifications}
          unreadCount={unreadCount}
        />
        <div
          id="main-content"
          tabIndex={-1}
          className="flex flex-1 flex-col pb-24 outline-none lg:pb-0"
        >
          {children}
        </div>
        <BottomNav isAdmin={isAdmin} hasAmenities={hasAmenities} />
      </div>
      {isAdmin && <ActionFab consorcioId={fabConsorcioId} />}
    </div>
  );
}
