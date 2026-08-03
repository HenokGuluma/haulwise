import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSessionUser, requireInternalRole, requirePagePermission } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DocumentsView } from "@/components/DocumentsView";
import { demoScope } from "@/lib/demo-scope";

export const metadata: Metadata = { title: "Documents & Billing" };

export default async function DocumentsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  requireInternalRole(user);
  requirePagePermission(user, "documents:view");

  const scope = demoScope(user);
  const [payAgg, pendingAgg, withDocs, loadCount] = await Promise.all([
    prisma.load.aggregate({ where: { ...scope, payoutStatus: { not: "NOT_BILLED" } }, _sum: { driverPay: true } }),
    prisma.load.aggregate({ where: { ...scope, payoutStatus: "PENDING" }, _sum: { driverPay: true } }),
    prisma.load.count({ where: { ...scope, documents: { some: {} } } }),
    prisma.load.count({ where: scope }),
  ]);

  return (
    <DocumentsView
      user={user}
      totals={{
        totalPay: payAgg._sum.driverPay ?? 0,
        totalPending: pendingAgg._sum.driverPay ?? 0,
        withDocs,
        loadCount,
      }}
    />
  );
}
