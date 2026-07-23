import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { customerContactUpdateSchema } from "@/lib/validation";

export async function PATCH(req: NextRequest, { params }: { params: { id: string; contactId: string } }) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const existing = await prisma.customerContact.findUnique({ where: { id: params.contactId } });
  if (!existing || existing.customerId !== params.id) return NextResponse.json({ error: "Contact not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = customerContactUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const contact = await prisma.$transaction(async (tx) => {
    if (parsed.data.isPrimary) {
      await tx.customerContact.updateMany({ where: { customerId: params.id, id: { not: params.contactId } }, data: { isPrimary: false } });
    }
    return tx.customerContact.update({
      where: { id: params.contactId },
      data: { ...parsed.data, email: parsed.data.email === "" ? null : parsed.data.email },
    });
  });

  return NextResponse.json({ contact });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; contactId: string } }) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const existing = await prisma.customerContact.findUnique({ where: { id: params.contactId } });
  if (!existing || existing.customerId !== params.id) return NextResponse.json({ error: "Contact not found." }, { status: 404 });

  await prisma.customerContact.delete({ where: { id: params.contactId } });
  return NextResponse.json({ ok: true });
}
