import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { roleUpdateSchema } from "@/lib/validation";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("roles:manage");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const existing = await prisma.role.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Role not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = roleUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const patch = parsed.data;

  if (patch.name && patch.name !== existing.name) {
    const clash = await prisma.role.findUnique({ where: { name: patch.name } });
    if (clash) return NextResponse.json({ error: `A role named "${patch.name}" already exists.` }, { status: 409 });
  }

  // Lockout guard: if this role currently grants roles:manage and the
  // update would drop it, require at least one other role still has it —
  // otherwise nobody could ever manage roles again.
  if (existing.permissions.includes("roles:manage") && patch.permissions && !patch.permissions.includes("roles:manage")) {
    const otherHolder = await prisma.role.findFirst({
      where: { id: { not: params.id }, permissions: { has: "roles:manage" } },
    });
    if (!otherHolder) {
      return NextResponse.json({ error: "At least one role must keep the \"Manage roles & permissions\" permission." }, { status: 409 });
    }
  }

  const role = await prisma.role.update({
    where: { id: params.id },
    data: patch,
    include: { _count: { select: { users: true } } },
  });

  return NextResponse.json({ role: { ...role, userCount: role._count.users } });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("roles:manage");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const existing = await prisma.role.findUnique({
    where: { id: params.id },
    include: { _count: { select: { users: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Role not found." }, { status: 404 });

  if (existing._count.users > 0) {
    return NextResponse.json(
      { error: `Cannot delete — "${existing.name}" is assigned to ${existing._count.users} user(s). Reassign them first.` },
      { status: 409 }
    );
  }

  await prisma.role.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
