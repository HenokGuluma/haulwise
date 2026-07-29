import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShellClient } from "@/components/AppShellClient";
import { demoScope } from "@/lib/demo-scope";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const scope = demoScope(user);
  const [boardCount, loadsCount, driversCount, equipmentCount] = await Promise.all([
    prisma.load.count({ where: { ...scope, status: { notIn: ["DELIVERED", "BILLED"] } } }),
    prisma.load.count({ where: scope }),
    prisma.driver.count({ where: scope }),
    prisma.equipment.count({ where: scope }),
  ]);

  const counts = {
    "/board": boardCount,
    "/loads": loadsCount,
    "/roster": driversCount + equipmentCount,
  };

  return (
    <AppShellClient user={user} counts={counts}>
      {children}
    </AppShellClient>
  );
}
