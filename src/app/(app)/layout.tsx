import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShellClient } from "@/components/AppShellClient";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [boardCount, loadsCount, driversCount, equipmentCount, customers] = await Promise.all([
    prisma.load.count({ where: { status: { notIn: ["DELIVERED", "BILLED"] } } }),
    prisma.load.count(),
    prisma.driver.count(),
    prisma.equipment.count(),
    prisma.customer.findMany({ orderBy: { companyName: "asc" } }),
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
