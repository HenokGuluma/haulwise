import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { demoScope } from "@/lib/demo-scope";

/**
 * Loads with an outstanding driver-pay balance, bucketed by days since
 * delivery — the standard "how long has this been owed" aging view for
 * chasing payables. Only loads that have actually delivered are aged;
 * anything still in transit isn't payable yet.
 */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const loads = await prisma.load.findMany({
    where: { ...demoScope(auth.user), status: { in: ["DELIVERED", "BILLED"] }, payoutStatus: { not: "PAID" } },
    include: { customer: true, payments: true },
    orderBy: { deliveryTime: "asc" },
  });

  const now = Date.now();
  const buckets = { "0-15": [] as unknown[], "15-30": [] as unknown[], "30+": [] as unknown[] };

  for (const load of loads) {
    const amountPaid = load.payments.reduce((s, p) => s + p.amount, 0);
    const remaining = load.driverPay - amountPaid;
    if (remaining <= 0) continue;

    const daysSinceDelivery = Math.floor((now - load.deliveryTime.getTime()) / (1000 * 60 * 60 * 24));
    const row = {
      id: load.id,
      loadNumber: load.loadNumber,
      customerName: load.customer?.companyName ?? "Deleted customer",
      deliveryTime: load.deliveryTime,
      driverPay: load.driverPay,
      amountPaid,
      remaining,
      daysSinceDelivery,
    };

    if (daysSinceDelivery <= 15) buckets["0-15"].push(row);
    else if (daysSinceDelivery <= 30) buckets["15-30"].push(row);
    else buckets["30+"].push(row);
  }

  return NextResponse.json({ buckets });
}
