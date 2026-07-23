import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { toCSV, fmtDate } from "@/lib/format";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Prisma.LoadWhereInput = {};
  if (from || to) {
    where.deliveryTime = {
      gte: from ? new Date(from) : undefined,
      lte: to ? new Date(to + "T23:59:59.999Z") : undefined,
    };
  }

  const loads = await prisma.load.findMany({
    where,
    include: { customer: true, documents: { orderBy: { uploadedAt: "desc" } } },
    orderBy: { pickupTime: "desc" },
  });

  const csv = toCSV(loads, [
    { label: "Load #", get: (l) => l.loadNumber },
    { label: "Customer", get: (l) => l.customer?.companyName ?? "Deleted customer" },
    { label: "Status", get: (l) => l.status },
    { label: "Delivery Date", get: (l) => fmtDate(l.deliveryTime) },
    { label: "Rate", get: (l) => l.rate },
    { label: "Driver Pay", get: (l) => l.driverPay },
    { label: "Payout Status", get: (l) => l.payoutStatus },
    { label: "BOL", get: (l) => (l.documents.some((d) => d.type === "BOL") ? "Yes" : "No") },
    { label: "POD", get: (l) => (l.documents.some((d) => d.type === "POD") ? "Yes" : "No") },
  ]);

  const suffix = from || to ? `-${from || "start"}-to-${to || "now"}` : "";
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="haulwise-ledger${suffix}.csv"`,
    },
  });
}
