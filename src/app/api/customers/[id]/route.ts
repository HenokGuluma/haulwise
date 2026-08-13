import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { customerUpdateSchema } from "@/lib/validation";
import { getStorageDriver } from "@/lib/storage";
import { demoScope } from "@/lib/demo-scope";
import { fullName } from "@/lib/format";

const ACTIVE_STATUSES = ["DRAFT", "ASSIGNED", "DISPATCHED", "IN_TRANSIT"] as const;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("customers:view");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const customer = await prisma.customer.findUnique({
    where: { id: params.id, ...demoScope(auth.user) },
    include: {
      contacts: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      documents: { orderBy: { uploadedAt: "desc" }, include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } } },
    },
  });
  if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });

  return NextResponse.json({
    customer: {
      ...customer,
      documents: customer.documents.map((d) => ({
        ...d,
        uploadedBy: d.uploadedBy ? { id: d.uploadedBy.id, name: fullName(d.uploadedBy.firstName, d.uploadedBy.lastName) } : null,
      })),
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("customers:edit");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Same demo-visibility scope as GET — without it, someone with
  // showMockData off could still patch a demo customer they can't see.
  const existing = await prisma.customer.findUnique({ where: { id: params.id, ...demoScope(auth.user) } });
  if (!existing) return NextResponse.json({ error: "Customer not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = customerUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  // Same case-insensitive company-name uniqueness as create, excluding this
  // customer itself so saving an unchanged name is fine.
  if (parsed.data.companyName) {
    const dup = await prisma.customer.findFirst({
      where: { companyName: { equals: parsed.data.companyName, mode: "insensitive" }, id: { not: params.id } },
      select: { id: true },
    });
    if (dup) {
      return NextResponse.json({ error: "A customer with this company name already exists." }, { status: 409 });
    }
  }

  const data = { ...parsed.data, ...(parsed.data.email !== undefined ? { email: parsed.data.email || null } : {}) };
  const customer = await prisma.customer.update({ where: { id: params.id }, data });
  return NextResponse.json({ customer });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("customers:delete");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Same demo-visibility scope as GET/PATCH — see the comment in PATCH above.
  const existing = await prisma.customer.findUnique({ where: { id: params.id, ...demoScope(auth.user) } });
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
