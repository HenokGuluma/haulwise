import "server-only";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import { SESSION_COOKIE } from "@/lib/session-cookie";

export { SESSION_COOKIE };
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  showMockData: boolean;
};

/** Verifies credentials and returns the matching user, or null. */
export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
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
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    // Expired — clean it up lazily and treat as logged out.
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
    showMockData: session.user.showMockData,
  };
}

/** Throws-free helper for Route Handlers: returns the user or a 401-shaped error payload. */
export async function requireUser(): Promise<{ user: SessionUser } | { error: string; status: number }> {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated.", status: 401 };
  return { user };
}

/** Same as requireUser, but also enforces the caller has one of the allowed roles. */
export async function requireRole(
  roles: Role[]
): Promise<{ user: SessionUser } | { error: string; status: number }> {
  const result = await requireUser();
  if ("error" in result) return result;
  if (!roles.includes(result.user.role)) {
    return { error: "You don't have permission to perform this action.", status: 403 };
  }
  return result;
}
