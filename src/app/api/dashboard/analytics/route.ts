import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { demoScope } from "@/lib/demo-scope";
import type { LoadStatus } from "@prisma/client";

const STATUS_LABELS: Record<LoadStatus, string> = {
  DRAFT: "Draft",
  ASSIGNED: "Assigned",
  DISPATCHED: "Dispatched",
  IN_TRANSIT: "In Transit",
  DELIVERED: "Delivered",
  BILLED: "Billed",
};
const MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit" });
const MAX_MONTHS = 36;
const TOP_CUSTOMER_LIMIT = 8;

/**
 * Aggregated series for the dashboard charts. Computed in JS rather than via
 * Prisma groupBy-by-month (awkward without raw SQL date_trunc) — the load
 * volume here (at most a few thousand rows even with demo data) makes that
 * cheap enough to just fetch once and reduce client-side.
 */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const loads = await prisma.load.findMany({
    where: demoScope(auth.user),
    select: {
      rate: true,
      status: true,
      pickupTime: true,
      customerId: true,
      customer: { select: { companyName: true } },
      equipmentTypeCode: true,
      equipmentType: { select: { label: true, tone: true } },
    },
  });

  // --- Monthly revenue + load count -----------------------------------------
  const monthMap = new Map<string, { revenue: number; loads: number; sortKey: string }>();
  for (const l of loads) {
    const key = `${l.pickupTime.getFullYear()}-${String(l.pickupTime.getMonth() + 1).padStart(2, "0")}`;
    const entry = monthMap.get(key) ?? { revenue: 0, loads: 0, sortKey: key };
    entry.revenue += l.rate;
    entry.loads += 1;
    monthMap.set(key, entry);
  }
  const monthly = Array.from(monthMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .slice(-MAX_MONTHS)
    .map(([key, v]) => {
      const [y, m] = key.split("-").map(Number);
      return { month: key, label: MONTH_FORMATTER.format(new Date(y, m - 1, 1)), revenue: v.revenue, loads: v.loads };
    });

  // --- Status breakdown (current snapshot) -----------------------------------
  const statusCounts = new Map<LoadStatus, number>();
  for (const l of loads) statusCounts.set(l.status, (statusCounts.get(l.status) ?? 0) + 1);
  const statusBreakdown = (Object.keys(STATUS_LABELS) as LoadStatus[])
    .map((status) => ({ status, label: STATUS_LABELS[status], count: statusCounts.get(status) ?? 0 }))
    .filter((s) => s.count > 0);

  // --- Top customers by all-time revenue -------------------------------------
  const customerRevenue = new Map<string, { name: string; revenue: number }>();
  for (const l of loads) {
    if (!l.customerId || !l.customer) continue;
    const entry = customerRevenue.get(l.customerId) ?? { name: l.customer.companyName, revenue: 0 };
    entry.revenue += l.rate;
    customerRevenue.set(l.customerId, entry);
  }
  const topCustomers = Array.from(customerRevenue.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, TOP_CUSTOMER_LIMIT);

  // --- Equipment type volume (last 12 months) ---------------------------------
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  const equipVolume = new Map<string, { label: string; tone: string; loads: number }>();
  for (const l of loads) {
    if (l.pickupTime < twelveMonthsAgo) continue;
    const key = l.equipmentTypeCode;
    const entry = equipVolume.get(key) ?? { label: l.equipmentType?.label ?? key, tone: l.equipmentType?.tone ?? "slate", loads: 0 };
    entry.loads += 1;
    equipVolume.set(key, entry);
  }
  const equipmentVolume = Array.from(equipVolume.values()).sort((a, b) => b.loads - a.loads);

  return NextResponse.json({ monthly, statusBreakdown, topCustomers, equipmentVolume });
}
