import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { equipmentTypeUpdateSchema } from "@/lib/validation";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("equipment-types:manage");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const existing = await prisma.equipmentType.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Equipment type not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = equipmentTypeUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const data = { ...parsed.data };
  if (data.code) {
    data.code = data.code.toUpperCase();
    if (data.code !== existing.code) {
      const clash = await prisma.equipmentType.findUnique({ where: { code: data.code } });
      if (clash) return NextResponse.json({ error: `An equipment type with code "${data.code}" already exists.` }, { status: 409 });
    }
  }

  // Renaming the code is safe — the FK on equipment.typeCode / loads.equipmentTypeCode
  // is ON UPDATE CASCADE, so every referencing row updates automatically.
  const type = await prisma.equipmentType.update({ where: { id: params.id }, data });
  return NextResponse.json({ type });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("equipment-types:manage");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const existing = await prisma.equipmentType.findUnique({
    where: { id: params.id },
    include: { _count: { select: { equipment: true, loads: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Equipment type not found." }, { status: 404 });

  if (existing._count.equipment > 0 || existing._count.loads > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete — "${existing.label}" is used by ${existing._count.equipment} unit${existing._count.equipment === 1 ? "" : "s"} and ${existing._count.loads} load${existing._count.loads === 1 ? "" : "s"}. Reassign them first.`,
      },
      { status: 409 }
    );
  }

  await prisma.equipmentType.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
