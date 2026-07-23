import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BoardView } from "@/components/BoardView";
import type { Load, Driver, Equipment, Customer } from "@/types";

export default async function BoardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [loads, drivers, equipment, customers] = await Promise.all([
    prisma.load.findMany({
      include: { customer: true, driver: true, equipment: true, documents: true },
      orderBy: { pickupTime: "asc" },
    }),
    prisma.driver.findMany({ orderBy: { firstName: "asc" } }),
    prisma.equipment.findMany({ orderBy: { unitNumber: "asc" } }),
    prisma.customer.findMany({ orderBy: { companyName: "asc" } }),
  ]);

  return (
    <BoardView
      user={user}
      initialLoads={JSON.parse(JSON.stringify(loads)) as Load[]}
      drivers={JSON.parse(JSON.stringify(drivers)) as Driver[]}
      equipment={JSON.parse(JSON.stringify(equipment)) as Equipment[]}
      customers={JSON.parse(JSON.stringify(customers)) as Customer[]}
    />
  );
}
