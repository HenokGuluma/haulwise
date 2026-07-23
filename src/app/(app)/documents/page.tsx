import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DocumentsView } from "@/components/DocumentsView";

export default async function DocumentsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [payAgg, pendingAgg, withDocs, loadCount] = await Promise.all([
    prisma.load.aggregate({ where: { payoutStatus: { not: "NOT_BILLED" } }, _sum: { driverPay: true } }),
    prisma.load.aggregate({ where: { payoutStatus: "PENDING" }, _sum: { driverPay: true } }),
    prisma.load.count({ where: { documents: { some: {} } } }),
    prisma.load.count(),
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
