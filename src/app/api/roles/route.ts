import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requirePermission } from "@/lib/auth";
import { roleCreateSchema } from "@/lib/validation";

// Small, low-cardinality list (a handful of roles) — no pagination, same
// treatment as /api/equipment-types. Includes live user counts so the
// management screen can show membership and the delete guard can explain
// why it's blocked.
//
// Readable by users:manage as well as roles:manage — the Users admin screen
// needs this list to populate its role picker even for an account that can
// manage users but not edit role definitions themselves.
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.user.permissions.includes("roles:manage") && !auth.user.permissions.includes("users:manage")) {
    return NextResponse.json({ error: "You don't have permission to perform this action." }, { status: 403 });
  }

  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { users: true } } },
  });

  const rows = roles.map((r) => ({ ...r, userCount: r._count.users }));
  return NextResponse.json({ rows });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission("roles:manage");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const parsed = roleCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const existing = await prisma.role.findUnique({ where: { name: parsed.data.name } });
  if (existing) return NextResponse.json({ error: `A role named "${parsed.data.name}" already exists.` }, { status: 409 });

  const role = await prisma.role.create({ data: parsed.data });
  return NextResponse.json({ role: { ...role, userCount: 0 } }, { status: 201 });
}
