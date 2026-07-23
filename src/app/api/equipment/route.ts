import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { equipmentCreateSchema } from "@/lib/validation";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const equipment = await prisma.equipment.findMany({ orderBy: { unitNumber: "asc" } });
  return NextResponse.json({ equipment });
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

  const equipment = await prisma.equipment.create({ data: parsed.data });
  return NextResponse.json({ equipment }, { status: 201 });
}
