import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { demoScope } from "@/lib/demo-scope";
import { customerScope } from "@/lib/customer-scope";
import { DASHBOARD_PERIODS, dashboardPeriodRange, type DashboardPeriod } from "@/lib/dashboard-period";

/**
 * Delivered count + Gross Volume/Revenue for the internal Dashboard's
 * period selector (This Week/Month/Year) — a single cheap aggregate,
 * mirroring the initial "this week" query dashboard/page.tsx already runs
 * server-side, so switching periods never falls back to pulling row data.
 */
export async function GET(req: Request) {
  const auth = await requirePermission("dashboard:view");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const periodParam = searchParams.get("period");
  const period: DashboardPeriod = (DASHBOARD_PERIODS as readonly string[]).includes(periodParam ?? "")
    ? (periodParam as DashboardPeriod)
    : "week";
  const { from, to } = dashboardPeriodRange(period);

  const scope = { ...demoScope(auth.user), ...customerScope(auth.user) };
  const agg = await prisma.load.aggregate({
    where: { ...scope, status: { in: ["DELIVERED", "BILLED"] }, deliveryTime: { gte: from, lte: to } },
    _count: true,
    _sum: { rate: true, driverPay: true },
  });

  const grossVolume = agg._sum.rate ?? 0;
  return NextResponse.json({
    period,
    deliveredCount: agg._count,
    grossVolume,
    // Net revenue reveals driver-pay margin — never computed for a
    // customer-scoped caller even though this route isn't wired into the
    // customer dashboard today, matching the same guard the analytics
    // route uses for its own netRevenue field.
    ...(auth.user.isCustomerScoped ? {} : { revenue: grossVolume - (agg._sum.driverPay ?? 0) }),
    fromIso: from.toISOString(),
    toIso: to.toISOString(),
  });
}
