import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSessionUser, requireInternalRole, requirePagePermission } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardView } from "@/components/DashboardView";
import { CustomerDashboardView } from "@/components/CustomerDashboardView";
import { demoScope } from "@/lib/demo-scope";
import { customerScope } from "@/lib/customer-scope";
import type { Driver, Equipment } from "@/types";

export const metadata: Metadata = { title: "Dashboard" };

const ACTIVE_STATUSES = ["DRAFT", "ASSIGNED", "DISPATCHED", "IN_TRANSIT"] as const;

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86_400_000);

  if (user.isCustomerScoped) {
    requirePagePermission(user, "dashboard:view");

    const scope = customerScope(user);
    const in8Days = new Date(today.getTime() + 8 * 86_400_000);

    const [activeCount, inTransitCount, deliveredThisWeekAgg, pickupsToday, deliveriesToday, pickupsUpcoming, deliveriesUpcoming] =
      await Promise.all([
        prisma.load.count({ where: { ...scope, status: { in: [...ACTIVE_STATUSES] } } }),
        prisma.load.count({ where: { ...scope, status: "IN_TRANSIT" } }),
        prisma.load.aggregate({
          where: { ...scope, status: { in: ["DELIVERED", "BILLED"] }, deliveryTime: { gte: weekAgo, lte: now } },
          _count: true,
          _sum: { rate: true },
        }),
        prisma.load.findMany({
          where: { ...scope, pickupTime: { gte: today, lt: tomorrow } },
          select: { id: true, loadNumber: true, origin: true, status: true },
          orderBy: { pickupTime: "asc" },
        }),
        prisma.load.findMany({
          where: { ...scope, deliveryTime: { gte: today, lt: tomorrow } },
          select: { id: true, loadNumber: true, destination: true, status: true },
          orderBy: { deliveryTime: "asc" },
        }),
        prisma.load.findMany({
          where: { ...scope, pickupTime: { gte: tomorrow, lt: in8Days } },
          select: { id: true, loadNumber: true, origin: true, status: true },
          orderBy: { pickupTime: "asc" },
        }),
        prisma.load.findMany({
          where: { ...scope, deliveryTime: { gte: tomorrow, lt: in8Days } },
          select: { id: true, loadNumber: true, destination: true, status: true },
          orderBy: { deliveryTime: "asc" },
        }),
      ]);

    return (
      <CustomerDashboardView
        user={user}
        stats={{
          activeCount,
          inTransitCount,
          deliveredThisWeekCount: deliveredThisWeekAgg._count,
          billedThisWeek: deliveredThisWeekAgg._sum.rate ?? 0,
          pickupsToday,
          deliveriesToday,
          pickupsUpcoming,
          deliveriesUpcoming,
        }}
      />
    );
  }

  requireInternalRole(user);
  requirePagePermission(user, "dashboard:view");

  const scope = demoScope(user);

  // Counts/sums computed in the database instead of fetching every load with
  // its full relations just to filter/reduce them in the browser — the
  // dashboard used to pull the whole loads table (documents included) on
  // every visit just to show a handful of numbers and a couple of short
  // lists.
  const [
    activeCount,
    inTransitCount,
    deliveredThisWeekAgg,
    unassigned,
    pickupsToday,
    deliveriesToday,
    drivers,
    equipment,
  ] = await Promise.all([
    prisma.load.count({ where: { ...scope, status: { in: [...ACTIVE_STATUSES] } } }),
    prisma.load.count({ where: { ...scope, status: "IN_TRANSIT" } }),
    prisma.load.aggregate({
      where: { ...scope, status: { in: ["DELIVERED", "BILLED"] }, deliveryTime: { gte: weekAgo, lte: now } },
      _count: true,
      _sum: { rate: true, driverPay: true },
    }),
    prisma.load.findMany({
      where: { ...scope, status: "ASSIGNED", OR: [{ driverId: null }, { equipmentId: null }] },
      select: { id: true, loadNumber: true },
      orderBy: { pickupTime: "asc" },
    }),
    prisma.load.findMany({
      where: { ...scope, pickupTime: { gte: today, lt: tomorrow } },
      select: { id: true, loadNumber: true, origin: true, status: true },
      orderBy: { pickupTime: "asc" },
    }),
    prisma.load.findMany({
      where: { ...scope, deliveryTime: { gte: today, lt: tomorrow } },
      select: { id: true, loadNumber: true, destination: true, status: true },
      orderBy: { deliveryTime: "asc" },
    }),
    prisma.driver.findMany({ where: scope }),
    prisma.equipment.findMany({ where: scope }),
  ]);

  return (
    <DashboardView
      user={user}
      stats={{
        activeCount,
        inTransitCount,
        deliveredThisWeekCount: deliveredThisWeekAgg._count,
        grossVolumeThisWeek: deliveredThisWeekAgg._sum.rate ?? 0,
        revenueThisWeek: (deliveredThisWeekAgg._sum.rate ?? 0) - (deliveredThisWeekAgg._sum.driverPay ?? 0),
        weekAgoIso: weekAgo.toISOString(),
        nowIso: now.toISOString(),
        unassigned,
        pickupsToday,
        deliveriesToday,
      }}
      drivers={JSON.parse(JSON.stringify(drivers)) as Driver[]}
      equipment={JSON.parse(JSON.stringify(equipment)) as Equipment[]}
    />
  );
}
