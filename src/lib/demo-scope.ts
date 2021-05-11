import type { SessionUser } from "@/lib/auth";

/**
 * Spread into a Prisma `where` clause on Customer/Driver/Equipment/Load to
 * hide seeded demo rows unless the viewing user has opted into seeing them
 * (User.showMockData). Returns `{}` (no extra filter) when the toggle is on,
 * so demo and real rows are shown side by side.
 */
export function demoScope(user: Pick<SessionUser, "showMockData">): { isDemo?: false } {
  return user.showMockData ? {} : { isDemo: false };
}
