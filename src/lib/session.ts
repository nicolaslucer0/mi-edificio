import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "./auth";
import { db } from "./db";
import { memberships, type roleEnum } from "./db/schema";

type Role = (typeof roleEnum.enumValues)[number];

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  memberships: Array<{
    id: string;
    role: Role;
    consorcioId: string | null;
    unitId: string | null;
  }>;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  isTenant: boolean;
  primaryRole: Role;
};

const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Administrador general",
  admin: "Administrador del consorcio",
  owner: "Propietario",
  tenant: "Inquilino",
};

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role];
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return null;

  const userMemberships = await db
    .select({
      id: memberships.id,
      role: memberships.role,
      consorcioId: memberships.consorcioId,
      unitId: memberships.unitId,
    })
    .from(memberships)
    .where(eq(memberships.userId, session.user.id));

  const roles = new Set(userMemberships.map((m) => m.role));
  const primaryRole: Role = roles.has("super_admin")
    ? "super_admin"
    : roles.has("admin")
      ? "admin"
      : roles.has("owner")
        ? "owner"
        : "tenant";

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
    memberships: userMemberships,
    isSuperAdmin: roles.has("super_admin"),
    isAdmin: roles.has("admin"),
    isOwner: roles.has("owner"),
    isTenant: roles.has("tenant"),
    primaryRole,
  };
});

export const requireUser = cache(async (): Promise<CurrentUser> => {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
});
