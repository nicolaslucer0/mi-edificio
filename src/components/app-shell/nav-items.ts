import {
  BarChart3,
  CalendarDays,
  Bell,
  CircleUser,
  Home,
  LayoutGrid,
  Receipt,
  ShieldCheck,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
  /** Una línea de qué es, para la lista de "Más". */
  description?: string;
  /**
   * Si va en la barra de abajo. La barra es para lo que se usa seguido, no
   * para todo lo que existe: con seis ítems quedan 60 px cada uno en un
   * teléfono, y la pastilla del ícono ya mide 48.
   */
  primary?: boolean;
  /** Agrupación en la pantalla de "Más". */
  group?: "consorcio" | "vos";
};

const ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Inicio",
    icon: Home,
    isActive: (p) => p === "/",
    primary: true,
  },
  {
    href: "/expensas",
    label: "Expensas",
    icon: Wallet,
    isActive: (p) => p.startsWith("/expensas"),
    description: "Tus expensas y tus pagos",
    primary: true,
    group: "vos",
  },
  {
    href: "/balance",
    label: "Balance",
    icon: BarChart3,
    isActive: (p) => p.startsWith("/balance"),
    description: "Cuánta plata tiene el consorcio",
    primary: true,
    group: "consorcio",
  },
  {
    href: "/gastos",
    label: "Gastos",
    icon: Receipt,
    isActive: (p) => p.startsWith("/gastos"),
    description: "En qué se gastó, con comprobantes",
    group: "consorcio",
  },
  {
    href: "/novedades",
    label: "Novedades",
    icon: Bell,
    isActive: (p) => p.startsWith("/novedades"),
    description: "Todos los avisos que recibiste",
    group: "vos",
  },
  {
    href: "/cuenta",
    label: "Mi cuenta",
    icon: CircleUser,
    isActive: (p) => p.startsWith("/cuenta"),
    description: "Estado de cuenta y avisos",
    group: "vos",
  },
];

const AMENITIES_ITEM: NavItem = {
  href: "/amenities",
  label: "Amenities",
  icon: CalendarDays,
  isActive: (p) => p.startsWith("/amenities"),
  description: "Reservar la pileta, la terraza o el SUM",
  group: "consorcio",
};

/**
 * Admin va en la barra aunque rompa la simetría con "Más": para quien
 * administra es el destino más usado de la app, y enterrarlo un nivel le cuesta
 * un toque extra decenas de veces por semana.
 */
const ADMIN_ITEM: NavItem = {
  href: "/admin",
  label: "Admin",
  icon: ShieldCheck,
  isActive: (p) => p.startsWith("/admin"),
  description: "Administrar el consorcio",
  primary: true,
};

const MORE_ITEM: NavItem = {
  href: "/mas",
  label: "Más",
  icon: LayoutGrid,
  isActive: (p) => p.startsWith("/mas"),
  primary: true,
};

/** Todos los destinos, en orden. Lo que usa el sidebar, que tiene espacio. */
export function getNavItems(
  isAdmin: boolean,
  hasAmenities: boolean,
): NavItem[] {
  const items = [...ITEMS];
  if (hasAmenities) items.push(AMENITIES_ITEM);
  if (isAdmin) items.push(ADMIN_ITEM);
  return items;
}

/** Solo los frecuentes, más "Más". Lo que usa la barra de abajo. */
export function getPrimaryNavItems(
  isAdmin: boolean,
  hasAmenities: boolean,
): NavItem[] {
  return [
    ...getNavItems(isAdmin, hasAmenities).filter((i) => i.primary),
    MORE_ITEM,
  ];
}

/** Lo que no entró en la barra, agrupado para la pantalla de "Más". */
export function getSecondaryNavItems(
  isAdmin: boolean,
  hasAmenities: boolean,
): NavItem[] {
  return getNavItems(isAdmin, hasAmenities).filter((i) => !i.primary);
}
