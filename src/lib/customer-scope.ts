import type { SessionUser } from "@/lib/auth";

/**
 * Spread into a Load-scoped Prisma `where` clause to restrict a
 * customer-scoped-role user to their own customer's rows. Internal roles see
 * everything ({}). A customer-scoped user with no customerId (shouldn't
 * happen — enforced at account creation — but defensive) is scoped to an
 * impossible id, so they see nothing rather than everything.
 */
export function customerScope(user: Pick<SessionUser, "isCustomerScoped" | "customerId">): { customerId?: string } {
  if (!user.isCustomerScoped) return {};
  return { customerId: user.customerId ?? "__none__" };
}
