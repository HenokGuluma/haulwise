import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { equipmentTypeCreateSchema } from "@/lib/validation";

// Small, low-cardinality list (a handful of equipment types) — no pagination,
// every caller (dropdowns, the management tab, board/DataTable filters)
// wants the full set. Includes live in-use counts so the management tab can
// show "3 units, 12 loads" and the delete guard can explain why it's blocked.
export async function GET() {
  const auth = await requireRole(["ADMIN", "DISPATCHER"]);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const types = await prisma.equipmentType.findMany({
    orderBy: { label: "asc" },
    include: { _count: { select: { equipment: true, loads: true } } },
  });

  const rows = types.map((t) => ({ ...t, equipmentCount: t._count.equipment, loadCount: t._count.loads }));
  return NextResponse.json({ rows });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(["ADMIN"]);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const parsed = equipmentTypeCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const code = parsed.data.code.toUpperCase();
  const existing = await prisma.equipmentType.findUnique({ where: { code } });
  if (existing) return NextResponse.json({ error: `An equipment type with code "${code}" already exists.` }, { status: 409 });

  const type = await prisma.equipmentType.create({ data: { ...parsed.data, code } });
  return NextResponse.json({ type }, { status: 201 });
}
