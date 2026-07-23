import { NextRequest, NextResponse } from "next/server";
import { Prisma, EquipmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { equipmentCreateSchema } from "@/lib/validation";
import { parseListParams } from "@/lib/pagination";

const SORT_MAP: Record<string, keyof Prisma.EquipmentOrderByWithRelationInput> = {
  unitNumber: "unitNumber",
  typeCode: "typeCode",
  status: "status",
  nextMaintenance: "nextMaintenance",
};

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const { page, pageSize, sortBy, sortDir, search, filters } = parseListParams(searchParams);

  const statusFilter = filters.status as EquipmentStatus[] | undefined;
  const typeFilter = filters.typeCode;
  const where: Prisma.EquipmentWhereInput = {
    status: statusFilter && statusFilter.length > 0 ? { in: statusFilter } : undefined,
    typeCode: typeFilter && typeFilter.length > 0 ? { in: typeFilter } : undefined,
    unitNumber: search ? { contains: search, mode: "insensitive" } : undefined,
  };

  const orderKey = (sortBy && SORT_MAP[sortBy]) || "unitNumber";
  const orderBy = { [orderKey]: sortDir } as Prisma.EquipmentOrderByWithRelationInput;

  const [rows, total] = await Promise.all([
    prisma.equipment.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.equipment.count({ where }),
  ]);

  return NextResponse.json({ rows, total });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const parsed = equipmentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const existing = await prisma.equipment.findUnique({ where: { unitNumber: parsed.data.unitNumber } });
  if (existing) {
    return NextResponse.json({ error: "A unit with this number already exists." }, { status: 409 });
  }

  const type = await prisma.equipmentType.findUnique({ where: { code: parsed.data.typeCode } });
  if (!type) return NextResponse.json({ error: "Unknown equipment type." }, { status: 400 });

  const equipment = await prisma.equipment.create({ data: parsed.data });
  return NextResponse.json({ equipment }, { status: 201 });
}
