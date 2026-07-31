import type { SessionUser } from "@/lib/auth";

/**
 * Spread into a Prisma `where` clause on Customer/Driver/Equipment/Load to
 * hide seeded demo rows unless the viewing user has opted into seeing them
 * (User.showMockData). Returns `{}` (no extra filter) when the toggle is on,
 * so demo and real rows are shown side by side.
 *
 * A customer-scoped account always sees its own customer's data regardless
 * of demo status — it's already restricted to exactly one customer via
 * customerScope(), so there's no "aggregate view" for demo rows to clutter.
 * Without this, a portal account assigned to a demo-seeded customer would
 * see zero loads: customerScope matches the customerId, but demoScope's
 * isDemo:false would still exclude every one of that customer's (demo) rows.
 */
export function demoScope(user: Pick<SessionUser, "showMockData" | "isCustomerScoped">): { isDemo?: false } {
  if (user.isCustomerScoped) return {};
  return user.showMockData ? {} : { isDemo: false };
}
