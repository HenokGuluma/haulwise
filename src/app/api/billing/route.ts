import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { toCSV, fmtDate } from "@/lib/format";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const loads = await prisma.load.findMany({
    include: { customer: true, documents: true },
    orderBy: { pickupTime: "desc" },
  });

  const csv = toCSV(loads, [
    { label: "Load #", get: (l) => l.loadNumber },
    { label: "Customer", get: (l) => l.customer.companyName },
    { label: "Status", get: (l) => l.status },
    { label: "Delivery Date", get: (l) => fmtDate(l.deliveryTime) },
    { label: "Rate", get: (l) => l.rate },
    { label: "Driver Pay", get: (l) => l.driverPay },
    { label: "Payout Status", get: (l) => l.payoutStatus },
    { label: "BOL", get: (l) => (l.documents.some((d) => d.type === "BOL") ? "Yes" : "No") },
    { label: "POD", get: (l) => (l.documents.some((d) => d.type === "POD") ? "Yes" : "No") },
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="haulwise-ledger-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
