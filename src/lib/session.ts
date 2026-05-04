import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "./auth";
import { db } from "./db";
import { memberships } from "./db/schema";
import type { Role } from "./roles";

export { roleLabel } from "./roles";
export type { Role } from "./roles";

const ROLE_PRIORITY: readonly Role[] = [
  "super_admin",
  "admin",
  "owner",
  "tenant",
];

function pickPrimaryRole(roles: Set<Role>): Role {
  return ROLE_PRIORITY.find((r) => roles.has(r)) ?? "tenant";
}

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
  const primaryRole = pickPrimaryRole(roles);

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
