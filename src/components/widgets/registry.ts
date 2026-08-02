import type { CurrentUser, Role } from "@/lib/session";
import { DeudaWidget } from "./deuda";
import { EstadoDePagosWidget } from "./estado-de-pagos";
import { InstallPromptWidget } from "./install-prompt";
import { TuAnioWidget } from "./tu-anio";
import { UltimosMovimientosWidget } from "./ultimos-movimientos";
import type { WidgetDef } from "./types";

/**
 * Los widgets del home. Agregar uno es agregar un archivo y una entrada acá:
 * `page.tsx` no se toca.
 */
const WIDGETS: readonly WidgetDef[] = [
  { id: "deuda", order: 10, Component: DeudaWidget },
  { id: "tu-anio", order: 15, Component: TuAnioWidget },
  { id: "estado-de-pagos", order: 20, Component: EstadoDePagosWidget },
  { id: "install-prompt", order: 30, Component: InstallPromptWidget },
  { id: "ultimos-movimientos", order: 80, Component: UltimosMovimientosWidget },
];

function hasAnyRole(user: CurrentUser, roles: readonly Role[]): boolean {
  return user.memberships.some((m) => roles.includes(m.role));
}

/**
 * Los widgets que le corresponden al usuario, en orden. El filtro es solo por
 * rol; que un widget tenga algo para mostrar lo decide él mismo devolviendo
 * `null`.
 */
export function widgetsForUser(user: CurrentUser): WidgetDef[] {
  return WIDGETS.filter((w) => !w.roles || hasAnyRole(user, w.roles)).sort(
    (a, b) => a.order - b.order,
  );
}
