import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BoardView } from "@/components/BoardView";
import { demoScope } from "@/lib/demo-scope";
import type { Load, Driver, Equipment, Customer } from "@/types";

export default async function BoardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const scope = demoScope(user);
  const [loads, drivers, equipment, customers] = await Promise.all([
    prisma.load.findMany({
      where: scope,
      include: { customer: true, driver: true, equipment: true, documents: { orderBy: { uploadedAt: "desc" } } },
      orderBy: { pickupTime: "asc" },
    }),
    prisma.driver.findMany({ where: scope, orderBy: { firstName: "asc" } }),
    prisma.equipment.findMany({ where: scope, orderBy: { unitNumber: "asc" } }),
    prisma.customer.findMany({ where: scope, orderBy: { companyName: "asc" } }),
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
