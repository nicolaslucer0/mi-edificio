import {
  BarChart3,
  CalendarDays,
  Home,
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
};

const BASE_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Inicio",
    icon: Home,
    isActive: (p) => p === "/",
  },
  {
    href: "/expensas",
    label: "Expensas",
    icon: Wallet,
    isActive: (p) => p.startsWith("/expensas"),
  },
  {
    href: "/gastos",
    label: "Gastos",
    icon: Receipt,
    isActive: (p) => p.startsWith("/gastos"),
  },
  {
    href: "/balance",
    label: "Balance",
    icon: BarChart3,
    isActive: (p) => p.startsWith("/balance"),
  },
];

const AMENITIES_ITEM: NavItem = {
  href: "/amenities",
  label: "Amenities",
  icon: CalendarDays,
  isActive: (p) => p.startsWith("/amenities"),
};

const ADMIN_ITEM: NavItem = {
  href: "/admin",
  label: "Admin",
  icon: ShieldCheck,
  isActive: (p) => p.startsWith("/admin"),
};

export function getNavItems(
  isAdmin: boolean,
  hasAmenities: boolean,
): NavItem[] {
  const items = [...BASE_ITEMS];
  if (hasAmenities) items.push(AMENITIES_ITEM);
  if (isAdmin) items.push(ADMIN_ITEM);
  return items;
}
