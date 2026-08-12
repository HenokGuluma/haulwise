import { NextRequest, NextResponse } from "next/server";
import { Prisma, DriverStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { driverCreateSchema } from "@/lib/validation";
import { driverUniquenessError } from "@/lib/driver-uniqueness";
import { parseListParams } from "@/lib/pagination";
import { demoScope } from "@/lib/demo-scope";

// Native Postgres enum sorts by declared order (AVAILABLE, ON_DUTY, OFF_DUTY),
// so `status: dir` already gives pipeline order, not alphabetical.
const SORT_MAP: Record<string, Prisma.DriverOrderByWithRelationInput> = {
  name: { firstName: "asc" },
  phone: { phone: "asc" },
  licenseNo: { licenseNo: "asc" },
  licenseExpiration: { licenseExpiration: "asc" },
  status: { status: "asc" },
};

export async function GET(req: NextRequest) {
  const auth = await requirePermission("roster:view");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const { page, pageSize, sortBy, sortDir, search, filters } = parseListParams(searchParams);

  const statusFilter = filters.status as DriverStatus[] | undefined;
  const where: Prisma.DriverWhereInput = {
    ...demoScope(auth.user),
    status: statusFilter && statusFilter.length > 0 ? { in: statusFilter } : undefined,
    OR: search
      ? [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
          { licenseNo: { contains: search, mode: "insensitive" } },
        ]
      : undefined,
  };

  const orderKey = sortBy && SORT_MAP[sortBy] ? Object.keys(SORT_MAP[sortBy])[0] : "firstName";
  const orderBy = { [orderKey]: sortDir } as Prisma.DriverOrderByWithRelationInput;

  const [rows, total] = await Promise.all([
    prisma.driver.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.driver.count({ where }),
  ]);

  return NextResponse.json({ rows, total });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission("roster:manage");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const parsed = driverCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const data = parsed.data;

  const conflict = await driverUniquenessError(data.firstName, data.lastName, data.phone);
  if (conflict) return NextResponse.json({ error: conflict }, { status: 409 });

  const equipmentId = data.equipmentId || null;
  if (equipmentId) {
    const eq = await prisma.equipment.findUnique({ where: { id: equipmentId }, select: { id: true } });
    if (!eq) return NextResponse.json({ error: "Selected equipment no longer exists." }, { status: 400 });
  }

  const driver = await prisma.driver.create({ data: { ...data, equipmentId } });
  return NextResponse.json({ driver }, { status: 201 });
}
