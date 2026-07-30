import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoadsView } from "@/components/LoadsView";
import { demoScope } from "@/lib/demo-scope";
import type { Customer, Driver, Equipment } from "@/types";

export default async function LoadsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const scope = demoScope(user);
  const isCustomer = user.role === "CUSTOMER";
  const [customers, drivers, equipment] = await Promise.all([
    isCustomer ? Promise.resolve([]) : prisma.customer.findMany({ where: scope, orderBy: { companyName: "asc" } }),
    isCustomer ? Promise.resolve([]) : prisma.driver.findMany({ where: scope, orderBy: { firstName: "asc" } }),
    isCustomer ? Promise.resolve([]) : prisma.equipment.findMany({ where: scope, orderBy: { unitNumber: "asc" } }),
  ]);

  return (
    <Suspense>
      <LoadsView
        user={user}
        customers={JSON.parse(JSON.stringify(customers)) as Customer[]}
        drivers={JSON.parse(JSON.stringify(drivers)) as Driver[]}
        equipment={JSON.parse(JSON.stringify(equipment)) as Equipment[]}
      />
    </Suspense>
  );
}
