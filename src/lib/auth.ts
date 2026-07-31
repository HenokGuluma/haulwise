import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/session-cookie";

export { SESSION_COOKIE };
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type SessionUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roleId: string;
  roleName: string;
  // True for portal logins scoped to a single Customer (see customerId
  // below) — sees only that customer's own loads/documents, nothing
  // fleet-wide. A property of the role, not a fixed role name.
  isCustomerScoped: boolean;
  permissions: string[];
  showMockData: boolean;
  // Set only when isCustomerScoped is true. Null otherwise.
  customerId: string | null;
};

/** Verifies credentials and returns the matching user (with its role), or null. */
export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() }, include: { role: true } });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return user;
}

/** Creates a server-side session row for a user. Returns the session id to set as a cookie value. */
export async function createSession(userId: string): Promise<{ id: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const session = await prisma.session.create({ data: { userId, expiresAt } });
  return { id: session.id, expiresAt };
}

/** Deletes a session row (logout). Safe to call with an unknown/missing id. */
export async function destroySession(sessionId: string | undefined) {
  if (!sessionId) return;
  await prisma.session.deleteMany({ where: { id: sessionId } });
}

/**
 * Reads the session cookie (if present) and resolves the current user from the
 * database. Returns null if there's no cookie, the session doesn't exist, or it
 * has expired. Used by Server Components, Route Handlers, and Server Actions.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: { include: { role: true } } },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    // Expired — clean it up lazily and treat as logged out.
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return {
    id: session.user.id,
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    email: session.user.email,
    roleId: session.user.roleId,
    roleName: session.user.role.name,
    isCustomerScoped: session.user.role.isCustomerScoped,
    permissions: session.user.role.permissions,
    showMockData: session.user.showMockData,
    customerId: session.user.customerId,
  };
}

/** Throws-free helper for Route Handlers: returns the user or a 401-shaped error payload. */
export async function requireUser(): Promise<{ user: SessionUser } | { error: string; status: number }> {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated.", status: 401 };
  return { user };
}

/** Same as requireUser, but also enforces the caller's role grants the given permission. */
export async function requirePermission(
  permission: string
): Promise<{ user: SessionUser } | { error: string; status: number }> {
  const result = await requireUser();
  if ("error" in result) return result;
  if (!result.user.permissions.includes(permission)) {
    return { error: "You don't have permission to perform this action.", status: 403 };
  }
  return result;
}

/** Pages open only to internal staff — bounces a customer-scoped session to their portal home. */
export function requireInternalRole(user: SessionUser, redirectTo = "/loads"): void {
  if (user.isCustomerScoped) redirect(redirectTo);
}

/**
 * Pages that need a specific permission beyond just "not customer-scoped" —
 * e.g. an Accountant role is internal (not customer-scoped) but shouldn't
 * reach the Roster or Dispatch Board pages, which it has no permission for.
 * Call alongside requireInternalRole, not instead of it — isCustomerScoped
 * blocks fleet-wide views architecturally regardless of any permission a
 * customer-scoped role might be (mis)configured with.
 */
export function requirePagePermission(user: SessionUser, permission: string, redirectTo = "/loads"): void {
  if (!user.permissions.includes(permission)) redirect(redirectTo);
}
