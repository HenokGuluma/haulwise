import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoadsView } from "@/components/LoadsView";
import type { Load, Customer, Driver, Equipment } from "@/types";

export default async function LoadsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [loads, customers, drivers, equipment] = await Promise.all([
    prisma.load.findMany({
      include: { customer: true, driver: true, equipment: true, documents: true },
      orderBy: { pickupTime: "desc" },
    }),
    prisma.customer.findMany({ orderBy: { companyName: "asc" } }),
    prisma.driver.findMany({ orderBy: { firstName: "asc" } }),
    prisma.equipment.findMany({ orderBy: { unitNumber: "asc" } }),
  ]);

  return (
    <LoadsView
      user={user}
      initialLoads={JSON.parse(JSON.stringify(loads)) as Load[]}
      customers={JSON.parse(JSON.stringify(customers)) as Customer[]}
      drivers={JSON.parse(JSON.stringify(drivers)) as Driver[]}
      equipment={JSON.parse(JSON.stringify(equipment)) as Equipment[]}
    />
  );
}
