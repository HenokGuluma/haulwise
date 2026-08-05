import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { demoScope } from "@/lib/demo-scope";
import { customerScope } from "@/lib/customer-scope";

/**
 * Sidebar nav-badge counts — same queries (app)/layout.tsx runs once at
 * initial render, exposed here so the client can re-pull just the counts
 * (never row data) after a mutation elsewhere on the page, instead of the
 * badges going stale until the next full navigation/router.refresh().
 */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const scope = { ...demoScope(auth.user), ...customerScope(auth.user) };

  if (auth.user.isCustomerScoped) {
    const loads = await prisma.load.count({ where: scope });
    return NextResponse.json({ "/loads": loads });
  }

  const [board, loads, drivers, equipment] = await Promise.all([
    prisma.load.count({ where: { ...scope, status: { notIn: ["DELIVERED", "BILLED"] } } }),
    prisma.load.count({ where: scope }),
    prisma.driver.count({ where: scope }),
    prisma.equipment.count({ where: scope }),
  ]);

  return NextResponse.json({ "/board": board, "/loads": loads, "/roster": drivers + equipment });
}
