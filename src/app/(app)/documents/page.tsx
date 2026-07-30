import { prisma } from "@/lib/prisma";
import { getSessionUser, requireInternalRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DocumentsView } from "@/components/DocumentsView";
import { demoScope } from "@/lib/demo-scope";

export default async function DocumentsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  requireInternalRole(user);

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
