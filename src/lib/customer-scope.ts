import type { SessionUser } from "@/lib/auth";

/**
 * Spread into a Load-scoped Prisma `where` clause to restrict a CUSTOMER-role
 * user to their own customer's rows. ADMIN/DISPATCHER see everything ({}). A
 * CUSTOMER with no customerId (shouldn't happen — enforced at account
 * creation — but defensive) is scoped to an impossible id, so they see
 * nothing rather than everything.
 */
export function customerScope(user: Pick<SessionUser, "role" | "customerId">): { customerId?: string } {
  if (user.role !== "CUSTOMER") return {};
  return { customerId: user.customerId ?? "__none__" };
}
