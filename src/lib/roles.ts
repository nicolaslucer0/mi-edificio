export type Role = "super_admin" | "admin" | "owner" | "tenant";

const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Administrador general",
  admin: "Administrador del consorcio",
  owner: "Propietario",
  tenant: "Inquilino",
};

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role];
}
