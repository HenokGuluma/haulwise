import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoadsView } from "@/components/LoadsView";
import type { Customer, Driver, Equipment } from "@/types";

export default async function LoadsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [customers, drivers, equipment] = await Promise.all([
    prisma.customer.findMany({ orderBy: { companyName: "asc" } }),
    prisma.driver.findMany({ orderBy: { firstName: "asc" } }),
    prisma.equipment.findMany({ orderBy: { unitNumber: "asc" } }),
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
