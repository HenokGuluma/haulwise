import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { loadCreateSchema } from "@/lib/validation";
import { LoadStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q")?.trim();

  const loads = await prisma.load.findMany({
    where: {
      status: status && status !== "All" ? (status as LoadStatus) : undefined,
      OR: q
        ? [
            { loadNumber: { contains: q, mode: "insensitive" } },
            { origin: { contains: q, mode: "insensitive" } },
            { destination: { contains: q, mode: "insensitive" } },
            { customer: { companyName: { contains: q, mode: "insensitive" } } },
          ]
        : undefined,
    },
    include: {
      customer: true,
      driver: true,
      equipment: true,
      documents: true,
    },
    orderBy: { pickupTime: "desc" },
  });

  return NextResponse.json({ loads });
}

// Generates the next sequential load number, e.g. HL-2415. Not safe against
// race conditions under heavy concurrent writes (a real production system
// would use a DB sequence) — acceptable for the MVP's internal-dispatcher
// write volume.
async function nextLoadNumber(): Promise<string> {
  const last = await prisma.load.findFirst({ orderBy: { createdAt: "desc" }, select: { loadNumber: true } });
  const lastNum = last ? parseInt(last.loadNumber.replace("HL-", ""), 10) : 2400;
  const next = Number.isFinite(lastNum) ? lastNum + 1 : 2401;
  return "HL-" + next;
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const parsed = loadCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const data = parsed.data;

  const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
  if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });

  const loadNumber = await nextLoadNumber();

  const load = await prisma.load.create({
    data: {
      loadNumber,
      customerId: data.customerId,
      origin: data.origin,
      destination: data.destination,
      pickupTime: data.pickupTime,
      deliveryTime: data.deliveryTime,
      weight: data.weight,
      rate: data.rate,
      commodity: data.commodity,
      equipmentTypeCode: data.equipmentTypeCode,
      driverPay: Math.round(data.rate * 0.68),
      status: "DRAFT",
    },
    include: { customer: true, driver: true, equipment: true, documents: true },
  });

  return NextResponse.json({ load }, { status: 201 });
}
