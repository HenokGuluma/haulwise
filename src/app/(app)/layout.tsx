import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShellClient } from "@/components/AppShellClient";
import { demoScope } from "@/lib/demo-scope";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const scope = demoScope(user);
  const [boardCount, loadsCount, driversCount, equipmentCount, customers] = await Promise.all([
    prisma.load.count({ where: { ...scope, status: { notIn: ["DELIVERED", "BILLED"] } } }),
    prisma.load.count({ where: scope }),
    prisma.driver.count({ where: scope }),
    prisma.equipment.count({ where: scope }),
    prisma.customer.findMany({
      where: scope,
      orderBy: { companyName: "asc" },
      select: { id: true, companyName: true, contactName: true, phone: true, email: true, status: true, paymentTerms: true, notes: true },
    }),
  ]);

  const counts = {
    "/board": boardCount,
    "/loads": loadsCount,
    "/roster": driversCount + equipmentCount,
  };

  return (
    <AppShellClient user={user} counts={counts} customers={customers}>
      {children}
    </AppShellClient>
  );
}
