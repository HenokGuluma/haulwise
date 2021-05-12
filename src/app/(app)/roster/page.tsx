import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { RosterView } from "@/components/RosterView";
import { demoScope } from "@/lib/demo-scope";

const ACTIVE_STATUSES = ["DRAFT", "ASSIGNED", "DISPATCHED", "IN_TRANSIT"] as const;

export default async function RosterPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const scope = demoScope(user);
  // Grouped counts instead of fetching every active load's id/driverId/
  // equipmentId and reducing them in the browser — same shape as the
  // per-customer active-load counts in /api/customers.
  const [byDriverAgg, byEquipmentAgg] = await Promise.all([
    prisma.load.groupBy({
      by: ["driverId"],
      where: { ...scope, status: { in: [...ACTIVE_STATUSES] }, driverId: { not: null } },
      _count: true,
    }),
    prisma.load.groupBy({
      by: ["equipmentId"],
      where: { ...scope, status: { in: [...ACTIVE_STATUSES] }, equipmentId: { not: null } },
      _count: true,
    }),
  ]);

  return (
    <Suspense>
      <RosterView
        user={user}
        activeLoadCounts={{
          byDriver: Object.fromEntries(byDriverAgg.map((r) => [r.driverId as string, r._count])),
          byEquipment: Object.fromEntries(byEquipmentAgg.map((r) => [r.equipmentId as string, r._count])),
        }}
      />
    </Suspense>
  );
}
