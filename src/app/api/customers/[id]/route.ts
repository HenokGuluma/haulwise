import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/auth";
import { customerUpdateSchema } from "@/lib/validation";
import { getStorageDriver } from "@/lib/storage";

const ACTIVE_STATUSES = ["DRAFT", "ASSIGNED", "DISPATCHED", "IN_TRANSIT"] as const;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: {
      contacts: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      documents: { orderBy: { uploadedAt: "desc" }, include: { uploadedBy: { select: { id: true, name: true } } } },
    },
  });
  if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });

  return NextResponse.json({ customer });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const existing = await prisma.customer.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Customer not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = customerUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const customer = await prisma.customer.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json({ customer });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN"]);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const existing = await prisma.customer.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Customer not found." }, { status: 404 });

  const activeCount = await prisma.load.count({ where: { customerId: params.id, status: { in: [...ACTIVE_STATUSES] } } });
  if (activeCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete — this customer has ${activeCount} active load${activeCount === 1 ? "" : "s"}. Complete or reassign them first.` },
      { status: 409 }
    );
  }

  // The DB cascade-deletes CustomerDocument rows, but their stored files
  // live outside Postgres — clean those up first or they'd be orphaned.
  const docs = await prisma.customerDocument.findMany({ where: { customerId: params.id }, select: { storageKey: true } });
  const storage = getStorageDriver();
  await Promise.all(docs.map((d) => storage.delete(d.storageKey)));

  await prisma.customer.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
