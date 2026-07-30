import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { maintenanceRecordSchema } from "@/lib/validation";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN", "DISPATCHER"]);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const records = await prisma.equipmentMaintenanceRecord.findMany({ where: { equipmentId: params.id }, orderBy: { date: "desc" } });
  return NextResponse.json({ records });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN", "DISPATCHER"]);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const equipment = await prisma.equipment.findUnique({ where: { id: params.id } });
  if (!equipment) return NextResponse.json({ error: "Equipment not found." }, { status: 404 });

  const parsed = maintenanceRecordSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const record = await prisma.equipmentMaintenanceRecord.create({
    data: {
      equipmentId: equipment.id,
      date: parsed.data.date,
      description: parsed.data.description,
      cost: parsed.data.cost ?? null,
      performedBy: parsed.data.performedBy || null,
    },
  });

  return NextResponse.json({ record }, { status: 201 });
}
