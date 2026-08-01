import type { ReactNode } from "react";
import type { CurrentUser, Role } from "@/lib/session";

/** Props que recibe todo widget del home. Siempre las mismas. */
export interface WidgetProps {
  user: CurrentUser;
  consorcioId: string | null;
}

export interface WidgetDef {
  /** Identificador estable; se usa como key en la grilla. */
  id: string;
  /** Posición en el home. De 10 en 10 para insertar sin renumerar todo. */
  order: number;
  /**
   * Si está, solo lo ven los usuarios que tengan alguno de esos roles (en
   * cualquiera de sus membresías). Sin esto, lo ve cualquiera.
   */
  roles?: readonly Role[];
  /**
   * Async (Server Component que trae sus datos) o sync (Client Component que
   * se autogestiona). Devuelve `null` cuando no corresponde mostrarlo: el
   * widget dibuja su propia celda, así que no deja hueco en la grilla.
   */
  Component: (props: WidgetProps) => ReactNode | Promise<ReactNode>;
}
