import { NextRequest, NextResponse } from "next/server";
import { Prisma, LoadStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { loadCreateSchema } from "@/lib/validation";
import { parseListParams } from "@/lib/pagination";
import { logActivity } from "@/lib/activity";

// Sortable columns exposed to the DataTable. Native Postgres enum columns
// (status) sort by their declared order — DRAFT..BILLED — which is the
// pipeline order, not alphabetical, so no special-casing is needed there.
const SORT_MAP: Record<string, Prisma.LoadOrderByWithRelationInput> = {
  loadNumber: { loadNumber: "asc" },
  customer: { customer: { companyName: "asc" } },
  pickupTime: { pickupTime: "asc" },
  deliveryTime: { deliveryTime: "asc" },
  status: { status: "asc" },
  rate: { rate: "asc" },
  driverPay: { driverPay: "asc" },
  payoutStatus: { payoutStatus: "asc" },
};

function withDir(order: Prisma.LoadOrderByWithRelationInput, dir: "asc" | "desc"): Prisma.LoadOrderByWithRelationInput {
  const [key, val] = Object.entries(order)[0];
  if (val && typeof val === "object") {
    const [nestedKey] = Object.entries(val)[0];
    return { [key]: { [nestedKey]: dir } } as Prisma.LoadOrderByWithRelationInput;
  }
  return { [key]: dir } as Prisma.LoadOrderByWithRelationInput;
}

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const { page, pageSize, sortBy, sortDir, search, filters } = parseListParams(searchParams);

  const statusFilter = filters.status as LoadStatus[] | undefined;
  const customerIdFilter = filters.customerId;
  const driverIdFilter = filters.driverId;
  const equipmentIdFilter = filters.equipmentId;

  const where: Prisma.LoadWhereInput = {
    status: statusFilter && statusFilter.length > 0 ? { in: statusFilter } : undefined,
    customerId: customerIdFilter && customerIdFilter.length > 0 ? { in: customerIdFilter } : undefined,
    driverId: driverIdFilter && driverIdFilter.length > 0 ? { in: driverIdFilter } : undefined,
    equipmentId: equipmentIdFilter && equipmentIdFilter.length > 0 ? { in: equipmentIdFilter } : undefined,
    OR: search
      ? [
          { loadNumber: { contains: search, mode: "insensitive" } },
          { origin: { contains: search, mode: "insensitive" } },
          { destination: { contains: search, mode: "insensitive" } },
          { commodity: { contains: search, mode: "insensitive" } },
          { customer: { companyName: { contains: search, mode: "insensitive" } } },
        ]
      : undefined,
  };

  const orderBy = sortBy && SORT_MAP[sortBy] ? withDir(SORT_MAP[sortBy], sortDir) : { pickupTime: "desc" as const };

  const [rows, total] = await Promise.all([
    prisma.load.findMany({
      where,
      include: { customer: true, driver: true, equipment: true, documents: { orderBy: { uploadedAt: "desc" } } },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.load.count({ where }),
  ]);

  return NextResponse.json({ rows, total });
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
    include: { customer: true, driver: true, equipment: true, documents: { orderBy: { uploadedAt: "desc" } } },
  });

  await logActivity(load.id, "CREATED", `Load ${load.loadNumber} created for ${customer.companyName}.`, auth.user.id);

  return NextResponse.json({ load }, { status: 201 });
}
