import { NextRequest, NextResponse } from "next/server";
import { Prisma, LoadStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, requirePermission } from "@/lib/auth";
import { loadCreateSchema } from "@/lib/validation";
import { parseListParams } from "@/lib/pagination";
import { logActivity } from "@/lib/activity";
import { demoScope } from "@/lib/demo-scope";
import { customerScope } from "@/lib/customer-scope";
import { computeRate, rateBasisQuantity } from "@/lib/rate-calc";
import { computeDriverPay, DEFAULT_DRIVER_PAY_TYPE, DEFAULT_DRIVER_PAY_VALUE } from "@/lib/driver-pay-calc";

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

  // Fixed (non-column) date-range params for deep links like the dashboard's
  // "Delivered This Week" / "Revenue This Week" cards — not a general
  // filter_<col> since a date range doesn't fit that multi-select contract.
  const deliveredFrom = searchParams.get("deliveredFrom");
  const deliveredTo = searchParams.get("deliveredTo");

  // customerScope (a CUSTOMER-role account's own customerId) always wins over
  // the customerId column filter — the filter dropdown is never offered to
  // CUSTOMER accounts, but this keeps the API itself from trusting a forged
  // filter_customerId param to see another customer's loads.
  const scopedCustomerId = customerScope(auth.user).customerId;
  const where: Prisma.LoadWhereInput = {
    ...demoScope(auth.user),
    status: statusFilter && statusFilter.length > 0 ? { in: statusFilter } : undefined,
    customerId: scopedCustomerId ?? (customerIdFilter && customerIdFilter.length > 0 ? { in: customerIdFilter } : undefined),
    driverId: driverIdFilter && driverIdFilter.length > 0 ? { in: driverIdFilter } : undefined,
    equipmentId: equipmentIdFilter && equipmentIdFilter.length > 0 ? { in: equipmentIdFilter } : undefined,
    deliveryTime: deliveredFrom || deliveredTo
      ? { gte: deliveredFrom ? new Date(deliveredFrom) : undefined, lte: deliveredTo ? new Date(deliveredTo) : undefined }
      : undefined,
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

// Generates the next sequential load number, e.g. HL-2415. Sorts by
// loadNumber itself, not createdAt — seeded/demo rows can have createdAt
// timestamps that don't line up with their load-number sequence (e.g. a
// backfilled load history), so "most recently created" isn't reliably
// "highest number" and using it here previously produced a number that
// already existed, failing every create on the loadNumber unique
// constraint. String-descending works because every load number is
// currently the same digit count (4); this'll need revisiting if the
// sequence ever reaches HL-10000.
//
// Not safe against race conditions under heavy concurrent writes (a real
// production system would use a DB sequence) — acceptable for the MVP's
// internal-dispatcher write volume.
async function nextLoadNumber(): Promise<string> {
  const last = await prisma.load.findFirst({ orderBy: { loadNumber: "desc" }, select: { loadNumber: true } });
  const lastNum = last ? parseInt(last.loadNumber.replace("HL-", ""), 10) : 2400;
  const next = Number.isFinite(lastNum) ? lastNum + 1 : 2401;
  return "HL-" + next;
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission("loads:create");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const parsed = loadCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const data = parsed.data;

  const canConfigureRate = auth.user.permissions.includes("loads:configure-rate");
  if (data.rateType !== "FLAT" && !canConfigureRate) {
    return NextResponse.json({ error: "You don't have permission to change how a load's rate is calculated." }, { status: 403 });
  }
  if ((data.driverPayType !== DEFAULT_DRIVER_PAY_TYPE || data.driverPayValue !== DEFAULT_DRIVER_PAY_VALUE) && !canConfigureRate) {
    return NextResponse.json({ error: "You don't have permission to change how driver pay is calculated." }, { status: 403 });
  }

  const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
  if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });

  const equipmentType = await prisma.equipmentType.findUnique({ where: { code: data.equipmentTypeCode } });
  if (!equipmentType) return NextResponse.json({ error: "Unknown equipment type." }, { status: 400 });

  const loadNumber = await nextLoadNumber();

  // Authoritative here regardless of what the client sent as `rate` — see
  // computeRate's own comment. FLAT trusts the manual entry unchanged.
  const rate = computeRate({
    rateType: data.rateType,
    rateBasisValue: data.rateBasisValue,
    flatRate: data.rate,
    weight: data.weight,
    distanceKm: data.distanceKm,
    pickupTime: data.pickupTime,
    deliveryTime: data.deliveryTime,
  });

  if (data.driverPayType === "PER_UNIT" && data.rateType === "FLAT") {
    return NextResponse.json({ error: "Own-rate driver pay needs a non-flat rate type." }, { status: 400 });
  }
  const basisQuantity = rateBasisQuantity({
    rateType: data.rateType,
    weight: data.weight,
    distanceKm: data.distanceKm,
    pickupTime: data.pickupTime,
    deliveryTime: data.deliveryTime,
  });
  const rawDriverPay =
    data.driverPayType === "FIXED" ? data.driverPayValue
    : data.driverPayType === "PER_UNIT" ? data.driverPayValue * (basisQuantity ?? 0)
    : null; // PERCENTAGE can't exceed rate by construction (capped 0-100)
  if (rawDriverPay !== null && rawDriverPay > rate) {
    return NextResponse.json({ error: "Driver pay can't exceed the rate." }, { status: 400 });
  }
  const driverPay = computeDriverPay({ driverPayType: data.driverPayType, driverPayValue: data.driverPayValue, rate, basisQuantity });

  const load = await prisma.load.create({
    data: {
      loadNumber,
      customerId: data.customerId,
      origin: data.origin,
      destination: data.destination,
      pickupTime: data.pickupTime,
      deliveryTime: data.deliveryTime,
      weight: data.weight,
      rate,
      rateType: data.rateType,
      rateBasisValue: data.rateType === "FLAT" ? null : data.rateBasisValue,
      distanceKm: data.rateType === "PER_KM" ? data.distanceKm : null,
      commodity: data.commodity,
      equipmentTypeCode: data.equipmentTypeCode,
      driverPay,
      driverPayType: data.driverPayType,
      driverPayValue: data.driverPayValue,
      status: "DRAFT",
    },
    include: { customer: true, driver: true, equipment: true, documents: { orderBy: { uploadedAt: "desc" } } },
  });

  await logActivity(load.id, "CREATED", `Load ${load.loadNumber} created for ${customer.companyName}.`, auth.user.id);

  return NextResponse.json({ load }, { status: 201 });
}
