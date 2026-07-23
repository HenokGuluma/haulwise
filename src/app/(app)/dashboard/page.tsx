import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardView } from "@/components/DashboardView";
import type { Load, Driver, Equipment } from "@/types";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [loads, drivers, equipment] = await Promise.all([
    prisma.load.findMany({
      include: { customer: true, driver: true, equipment: true, documents: true },
      orderBy: { pickupTime: "asc" },
    }),
    prisma.driver.findMany(),
    prisma.equipment.findMany(),
  ]);

  return (
    <DashboardView
      user={user}
      initialLoads={JSON.parse(JSON.stringify(loads)) as Load[]}
      drivers={JSON.parse(JSON.stringify(drivers)) as Driver[]}
      equipment={JSON.parse(JSON.stringify(equipment)) as Equipment[]}
    />
  );
}
