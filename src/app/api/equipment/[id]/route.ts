import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { equipmentUpdateSchema } from "@/lib/validation";
import { demoScope } from "@/lib/demo-scope";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("roster:view");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const equipment = await prisma.equipment.findUnique({ where: { id: params.id, ...demoScope(auth.user) } });
  if (!equipment) return NextResponse.json({ error: "Equipment not found." }, { status: 404 });

  return NextResponse.json({ equipment });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("roster:manage");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Same demo-visibility scope as GET — previously missing here, and the
  // blanket .catch(() => null) below on the update itself masked *any*
  // failure (a real DB error, not just "not found") behind the same
  // generic 404, which this existence pre-check now replaces.
  const existing = await prisma.equipment.findUnique({ where: { id: params.id, ...demoScope(auth.user) } });
  if (!existing) return NextResponse.json({ error: "Equipment not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = equipmentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  if (parsed.data.typeCode) {
    const type = await prisma.equipmentType.findUnique({ where: { code: parsed.data.typeCode } });
    if (!type) return NextResponse.json({ error: "Unknown equipment type." }, { status: 400 });
  }

  const equipment = await prisma.equipment.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json({ equipment });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("roster:delete");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Same demo-visibility scope as GET/PATCH — see the comment in PATCH above.
  const existing = await prisma.equipment.findUnique({ where: { id: params.id, ...demoScope(auth.user) } });
  if (!existing) return NextResponse.json({ error: "Equipment not found." }, { status: 404 });

  const activeLoad = await prisma.load.findFirst({
    where: { equipmentId: params.id, status: { in: ["DRAFT", "ASSIGNED", "DISPATCHED", "IN_TRANSIT"] } },
  });
  if (activeLoad) {
    return NextResponse.json(
      { error: `Cannot delete — this unit is currently assigned to active load ${activeLoad.loadNumber}.` },
      { status: 409 }
    );
  }

  await prisma.equipment.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
