import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/auth";
import { equipmentUpdateSchema } from "@/lib/validation";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const equipment = await prisma.equipment.findUnique({ where: { id: params.id } });
  if (!equipment) return NextResponse.json({ error: "Equipment not found." }, { status: 404 });

  return NextResponse.json({ equipment });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const parsed = equipmentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const equipment = await prisma.equipment
    .update({ where: { id: params.id }, data: parsed.data })
    .catch(() => null);
  if (!equipment) return NextResponse.json({ error: "Equipment not found." }, { status: 404 });

  return NextResponse.json({ equipment });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN"]);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const activeLoad = await prisma.load.findFirst({
    where: { equipmentId: params.id, status: { in: ["DRAFT", "ASSIGNED", "DISPATCHED", "IN_TRANSIT"] } },
  });
  if (activeLoad) {
    return NextResponse.json(
      { error: `Cannot delete — this unit is currently assigned to active load ${activeLoad.loadNumber}.` },
      { status: 409 }
    );
  }

  await prisma.equipment.delete({ where: { id: params.id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
