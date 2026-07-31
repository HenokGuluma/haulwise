import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShellClient } from "@/components/AppShellClient";
import { demoScope } from "@/lib/demo-scope";
import { customerScope } from "@/lib/customer-scope";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const scope = { ...demoScope(user), ...customerScope(user) };

  if (user.isCustomerScoped) {
    const loadsCount = await prisma.load.count({ where: scope });
    return (
      <AppShellClient user={user} counts={{ "/loads": loadsCount }}>
        {children}
      </AppShellClient>
    );
  }

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
